import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import pg from "pg";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const runtime = "nodejs";

const { Pool } = pg;
const rawDbUrl = (process.env.DATABASE_URL || "").trim();
const dbUrl = rawDbUrl.replace(/^['"]|['"]$/g, "");
const jwtSecret = process.env.JWT_SECRET || "secret";
const appTimeZone = process.env.APP_TIMEZONE || "America/Tegucigalpa";

if (!dbUrl) throw new Error("DATABASE_URL is required");

const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});

let initPromise: Promise<void> | null = null;

async function ensureInitialized() {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const schemaPath = path.join(process.cwd(), "schema.sql");
    const schema = await fs.readFile(schemaPath, "utf8");
    await pool.query(schema);

    const itEmail = "it@bwpwater.com";
    const itPassword = "1995951995b";
    const hashedPassword = await bcrypt.hash(itPassword, 10);
    await pool.query(
      `INSERT INTO users (name, email, role, password_hash, id_number, status)
       VALUES ('IT Admin', $1, 'it', $2, '000000', 'active')
       ON CONFLICT (email) DO UPDATE SET password_hash = $2`,
      [itEmail, hashedPassword]
    );
  })();
  return initPromise;
}

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

function unauthorized(message = "No autorizado") {
  return json({ message }, 401);
}

function forbidden(message = "Acceso denegado") {
  return json({ message }, 403);
}

function serverError(err: unknown) {
  return json({ message: "Error del servidor", error: String(err) }, 500);
}

function getBearerToken(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return null;
  const [prefix, token] = authHeader.split(" ");
  if (prefix !== "Bearer" || !token) return null;
  return token;
}

function verifyToken(req: NextRequest): { id: number; role: string; mustChange?: boolean } | null {
  const token = getBearerToken(req);
  if (!token) return null;
  try {
    return jwt.verify(token, jwtSecret) as { id: number; role: string; mustChange?: boolean };
  } catch {
    return null;
  }
}

function isAdminOrIT(role: string) {
  return role === "admin" || role === "it";
}

function normalizeCustomerType(type: string) {
  return String(type || "").toLowerCase() === "company" ? "company" : "individual";
}

async function parseBody(req: NextRequest) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

async function handleAuthLogin(req: NextRequest) {
  const body = await parseBody(req);
  const identifier = String(body.identifier || "").trim();
  const password = String(body.password || "");
  if (!identifier || !password) return json({ message: "Debe enviar usuario y contraseña" }, 400);

  const result = await pool.query(
    "SELECT * FROM users WHERE email = $1 OR id_number = $1 OR (role = 'it' AND UPPER($1) = 'IT')",
    [identifier]
  );
  if (result.rows.length === 0) return json({ message: "Credenciales inválidas" }, 401);

  const user = result.rows[0];
  const validPassword = await bcrypt.compare(password, user.password_hash);
  if (!validPassword) {
    if (user.temp_password === password && user.must_change_password) {
      const token = jwt.sign({ id: user.id, role: user.role, mustChange: true }, jwtSecret, { expiresIn: "1h" });
      return json({ token, user: { id: user.id, name: user.name, role: user.role, mustChange: true } });
    }
    return json({ message: "Credenciales inválidas" }, 401);
  }

  const token = jwt.sign({ id: user.id, role: user.role }, jwtSecret, { expiresIn: "24h" });
  return json({
    token,
    user: { id: user.id, name: user.name, role: user.role, email: user.email, id_number: user.id_number },
  });
}

async function handleAuthChangePassword(req: NextRequest) {
  const auth = verifyToken(req);
  if (!auth) return unauthorized();
  const body = await parseBody(req);
  const newPassword = String(body.newPassword || "");
  if (!newPassword) return json({ message: "Nueva contraseña requerida" }, 400);
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await pool.query(
    "UPDATE users SET password_hash = $1, temp_password = NULL, must_change_password = FALSE WHERE id = $2",
    [hashedPassword, auth.id]
  );
  return json({ message: "Contraseña actualizada correctamente" });
}

async function handleAuthProfile(req: NextRequest) {
  const auth = verifyToken(req);
  if (!auth) return unauthorized();
  const result = await pool.query(
    "SELECT id, name, email, role, id_number, status, zone, vehicle, current_correlative, correlative_end, current_stock, permissions FROM users WHERE id = $1",
    [auth.id]
  );
  if (result.rows.length === 0) return json({ message: "Usuario no encontrado" }, 404);
  return json(result.rows[0]);
}

async function handleUsersGet(req: NextRequest) {
  const auth = verifyToken(req);
  if (!auth) return unauthorized();
  if (!isAdminOrIT(auth.role)) return forbidden();
  const result = await pool.query(
    "SELECT id, name, email, role, id_number, status, zone, vehicle, current_correlative, correlative_end, current_stock FROM users ORDER BY created_at DESC"
  );
  return json(result.rows);
}

async function handleUsersCreate(req: NextRequest) {
  const auth = verifyToken(req);
  if (!auth) return unauthorized();
  if (!isAdminOrIT(auth.role)) return forbidden();
  const body = await parseBody(req);
  const { name, email, role, zone, vehicle, correlativeStart, correlativeEnd } = body;
  const normalizedName = String(name || "").trim();
  const normalizedRole = String(role || "").trim().toLowerCase();
  const normalizedEmail = String(email || "").trim() || null;
  const startCorrelative = Number.isFinite(Number(correlativeStart)) ? Number(correlativeStart) : 0;
  const endCorrelative = Number.isFinite(Number(correlativeEnd)) ? Number(correlativeEnd) : 0;

  if (!normalizedName) return json({ message: "El nombre del usuario es obligatorio." }, 400);
  if (!["seller", "admin", "it"].includes(normalizedRole)) {
    return json({ message: "Rol inválido. Debe ser seller, admin o it." }, 400);
  }
  if (startCorrelative < 0 || endCorrelative < 0) {
    return json({ message: "Las correlativas no pueden ser negativas." }, 400);
  }
  if (endCorrelative > 0 && startCorrelative > endCorrelative) {
    return json({ message: "La correlativa de inicio no puede ser mayor que la final." }, 400);
  }
  if (normalizedEmail) {
    const emailCheck = await pool.query("SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1", [normalizedEmail]);
    if (emailCheck.rows.length > 0) return json({ message: "El correo ya existe en otro usuario." }, 409);
  }

  let idNumber = "";
  let isUnique = false;
  while (!isUnique) {
    idNumber = Math.floor(100000 + Math.random() * 900000).toString();
    const check = await pool.query("SELECT id FROM users WHERE id_number = $1", [idNumber]);
    if (check.rows.length === 0) isUnique = true;
  }

  const tempPassword = Math.floor(1000 + Math.random() * 9000).toString();
  const hashedPassword = await bcrypt.hash(tempPassword, 10);
  try {
    const result = await pool.query(
      `INSERT INTO users (name, email, role, password_hash, id_number, temp_password, must_change_password, zone, vehicle, current_correlative, correlative_end)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7, $8, $9, $10) RETURNING id, id_number, temp_password`,
      [normalizedName, normalizedEmail, normalizedRole, hashedPassword, idNumber, tempPassword, zone || null, vehicle || null, startCorrelative, endCorrelative]
    );
    return json(result.rows[0]);
  } catch (err: any) {
    if (err?.code === "23505") {
      if (String(err?.constraint || "").includes("email")) {
        return json({ message: "El correo ya existe en otro usuario." }, 409);
      }
      if (String(err?.constraint || "").includes("id_number")) {
        return json({ message: "No se pudo generar un ID único. Intente nuevamente." }, 409);
      }
      return json({ message: "Registro duplicado al crear el usuario." }, 409);
    }
    if (err?.code === "23514") {
      return json({ message: "Datos inválidos para crear usuario (rol o estado no permitido)." }, 400);
    }
    if (err?.code === "22P02") {
      return json({ message: "Datos numéricos inválidos en correlativas." }, 400);
    }
    throw err;
  }
}

async function handleUsersResetPassword(req: NextRequest, userId: string) {
  const auth = verifyToken(req);
  if (!auth) return unauthorized();
  if (!isAdminOrIT(auth.role)) return forbidden();
  const tempPassword = Math.floor(1000 + Math.random() * 9000).toString();
  const hashedPassword = await bcrypt.hash(tempPassword, 10);
  await pool.query(
    "UPDATE users SET password_hash = $1, temp_password = $2, must_change_password = TRUE WHERE id = $3",
    [hashedPassword, tempPassword, userId]
  );
  return json({ tempPassword });
}

async function handleCustomersGet(req: NextRequest) {
  const auth = verifyToken(req);
  if (!auth) return unauthorized();
  const result = await pool.query("SELECT * FROM customers ORDER BY name ASC");
  return json(result.rows);
}

async function handleCustomersCreate(req: NextRequest) {
  const auth = verifyToken(req);
  if (!auth) return unauthorized();
  const body = await parseBody(req);
  const { name, type, rtn, phone, address, balance } = body;
  const result = await pool.query(
    "INSERT INTO customers (name, type, rtn, phone, address, balance) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
    [name, normalizeCustomerType(type), rtn || null, phone || null, address || null, Number(balance || 0)]
  );
  return json(result.rows[0]);
}

async function handleCustomersUpdate(req: NextRequest, customerId: string) {
  const auth = verifyToken(req);
  if (!auth) return unauthorized();
  const body = await parseBody(req);
  const { name, type, rtn, phone, address, balance } = body;
  const result = await pool.query(
    `UPDATE customers
     SET name = $1, type = $2, rtn = $3, phone = $4, address = $5, balance = $6
     WHERE id = $7
     RETURNING *`,
    [name, normalizeCustomerType(type), rtn || null, phone || null, address || null, Number(balance || 0), customerId]
  );
  if (result.rows.length === 0) return json({ message: "Cliente no encontrado" }, 404);
  return json(result.rows[0]);
}

async function handleProductsGet(req: NextRequest) {
  const auth = verifyToken(req);
  if (!auth) return unauthorized();
  const result = await pool.query(
    "SELECT DISTINCT ON (LOWER(name)) id, name, description, price, is_default, created_at FROM products ORDER BY LOWER(name), id ASC"
  );
  return json(result.rows);
}

async function handleProductsCreate(req: NextRequest) {
  const auth = verifyToken(req);
  if (!auth) return unauthorized();
  if (!isAdminOrIT(auth.role)) return forbidden();
  const body = await parseBody(req);
  const { name, description, price } = body;
  const exists = await pool.query("SELECT id, name, description, price, is_default, created_at FROM products WHERE LOWER(name) = LOWER($1) LIMIT 1", [name]);
  if (exists.rows.length > 0) return json(exists.rows[0]);
  const result = await pool.query(
    "INSERT INTO products (name, description, price) VALUES ($1, $2, $3) RETURNING *",
    [name, description || null, Number(price || 0)]
  );
  return json(result.rows[0]);
}

async function handleProductsUpdate(req: NextRequest, productId: string) {
  const auth = verifyToken(req);
  if (!auth) return unauthorized();
  if (!isAdminOrIT(auth.role)) return forbidden();
  const body = await parseBody(req);
  const { name, description, price } = body;
  const result = await pool.query(
    "UPDATE products SET name = $1, description = $2, price = $3 WHERE id = $4 RETURNING *",
    [name, description || null, Number(price || 0), productId]
  );
  if (result.rows.length === 0) return json({ message: "Producto no encontrado" }, 404);
  return json(result.rows[0]);
}

async function handleProductsDelete(req: NextRequest, productId: string) {
  const auth = verifyToken(req);
  if (!auth) return unauthorized();
  if (!isAdminOrIT(auth.role)) return forbidden();
  await pool.query("DELETE FROM products WHERE id = $1", [productId]);
  return json({ success: true });
}

async function handleSalesGet(req: NextRequest) {
  const auth = verifyToken(req);
  if (!auth) return unauthorized();
  let sql = `
    SELECT s.*, COALESCE(c.name, 'N/A') as customer_name, u.name as seller_name, p.name as product_name,
           timezone('${appTimeZone}', s.timestamp) as local_timestamp,
           to_char(timezone('${appTimeZone}', s.timestamp), 'YYYY-MM-DD') as local_date
    FROM sales s
    LEFT JOIN customers c ON s.customer_id = c.id
    JOIN users u ON s.seller_id = u.id
    JOIN products p ON s.product_id = p.id
  `;
  const params: Array<number> = [];
  if (auth.role === "seller") {
    sql += " WHERE s.seller_id = $1";
    params.push(auth.id);
  }
  sql += " ORDER BY s.timestamp DESC";
  const result = await pool.query(sql, params);
  return json(result.rows);
}

async function handleSalesCreate(req: NextRequest) {
  const auth = verifyToken(req);
  if (!auth) return unauthorized();
  const body = await parseBody(req);
  const { customerId, productId, quantity, unitPrice, paymentType, isCredit, correlative } = body;
  const q = Number(quantity || 0);
  const up = Number(unitPrice || 0);
  const totalAmount = q * up;
  try {
    await pool.query("BEGIN");
    const result = await pool.query(
      `INSERT INTO sales (seller_id, customer_id, product_id, quantity, unit_price, total_amount, payment_type, is_credit, correlative)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [auth.id, customerId, productId, q, up, totalAmount, paymentType, Boolean(isCredit), correlative]
    );
    await pool.query("UPDATE users SET current_stock = current_stock - $1, current_correlative = $2 WHERE id = $3", [q, correlative, auth.id]);
    if (isCredit) await pool.query("UPDATE customers SET balance = balance + $1 WHERE id = $2", [totalAmount, customerId]);
    await pool.query("COMMIT");
    return json(result.rows[0]);
  } catch (err) {
    await pool.query("ROLLBACK");
    throw err;
  }
}

async function handleExpensesCreate(req: NextRequest) {
  const auth = verifyToken(req);
  if (!auth) return unauthorized();
  const body = await parseBody(req);
  const { amount, description, receiptNumber, occurredAt } = body;
  const amt = Number(amount || 0);
  const desc = String(description || "").trim();
  if (!Number.isFinite(amt) || amt <= 0) return json({ message: "Monto inválido para gasto." }, 400);
  if (!desc) return json({ message: "La descripción del gasto es obligatoria." }, 400);

  if (auth.role === "seller") {
    const lastClosureRes = await pool.query(
      `SELECT timestamp
       FROM closures
       WHERE seller_id = $1
       ORDER BY timestamp DESC
       LIMIT 1`,
      [auth.id]
    );
    const lastClosureTs = lastClosureRes.rows[0]?.timestamp || null;

    const activityRes = lastClosureTs
      ? await pool.query(
          `SELECT
             (SELECT COUNT(*) FROM dispatches WHERE seller_id = $1 AND timestamp > $2) AS dispatch_count,
             (SELECT COUNT(*) FROM sales WHERE seller_id = $1 AND timestamp > $2) AS sales_count`,
          [auth.id, lastClosureTs]
        )
      : await pool.query(
          `SELECT
             (SELECT COUNT(*) FROM dispatches WHERE seller_id = $1) AS dispatch_count,
             (SELECT COUNT(*) FROM sales WHERE seller_id = $1) AS sales_count`,
          [auth.id]
        );
    const dispatchCount = Number(activityRes.rows[0]?.dispatch_count || 0);
    const salesCount = Number(activityRes.rows[0]?.sales_count || 0);
    if (dispatchCount === 0 && salesCount === 0) {
      return json({ message: "No tiene un corte abierto. Debe iniciar ruta (despacho) antes de registrar gastos." }, 400);
    }
  }

  const parsedOccurredAt = occurredAt ? new Date(String(occurredAt)) : null;
  const effectiveTimestamp = parsedOccurredAt && !Number.isNaN(parsedOccurredAt.getTime())
    ? parsedOccurredAt.toISOString()
    : null;
  const result = await pool.query(
    "INSERT INTO expenses (user_id, amount, description, receipt_number, timestamp) VALUES ($1, $2, $3, $4, COALESCE($5::timestamptz, CURRENT_TIMESTAMP)) RETURNING *",
    [auth.id, amt, desc, receiptNumber || null, effectiveTimestamp]
  );
  return json(result.rows[0]);
}

async function handleExpensesGet(req: NextRequest) {
  const auth = verifyToken(req);
  if (!auth) return unauthorized();
  let sql = `
    SELECT e.*,
           u.name AS user_name,
           u.role AS user_role,
           to_char(timezone('${appTimeZone}', e.timestamp), 'YYYY-MM-DD') AS local_date
    FROM expenses e
    LEFT JOIN users u ON u.id = e.user_id
  `;
  const params: Array<number> = [];
  if (auth.role === "seller") {
    sql += " WHERE e.user_id = $1";
    params.push(auth.id);
  }
  sql += " ORDER BY e.timestamp DESC";
  const result = await pool.query(sql, params);
  return json(result.rows.map((r: any) => ({ ...r, date: r.local_date })));
}

async function handleDispatchesGet(req: NextRequest) {
  const auth = verifyToken(req);
  if (!auth) return unauthorized();
  const result = await pool.query(
    `SELECT d.*, u.name AS seller_name
     FROM dispatches d
     LEFT JOIN users u ON d.seller_id = u.id
     ORDER BY d.timestamp DESC`
  );
  const dispatchIds = result.rows.map((r: any) => Number(r.id));
  let typeByDispatchId = new Map<number, string>();
  if (dispatchIds.length > 0) {
    const logRes = await pool.query(
      `SELECT details
       FROM logs
       WHERE action = 'dispatch_event'
         AND (details->>'dispatchId')::int = ANY($1::int[])`,
      [dispatchIds]
    );
    typeByDispatchId = new Map<number, string>(
      logRes.rows.map((r: any) => [Number(r.details?.dispatchId || 0), String(r.details?.type || "reload")])
    );
  }
  return json(result.rows.map((r: any) => ({ ...r, type: typeByDispatchId.get(Number(r.id)) || "reload" })));
}

async function handleDispatchesCreate(req: NextRequest) {
  const auth = verifyToken(req);
  if (!auth) return unauthorized();
  if (!isAdminOrIT(auth.role)) return forbidden();
  const body = await parseBody(req);
  const { seller_id, quantity, type } = body;
  const dispatchType = String(type || "reload") === "initial" ? "initial" : "reload";
  const result = await pool.query(
    "INSERT INTO dispatches (seller_id, product_id, quantity) VALUES ($1, NULL, $2) RETURNING *",
    [Number(seller_id), Number(quantity || 0)]
  );
  await pool.query("UPDATE users SET current_stock = current_stock + $1 WHERE id = $2", [Number(quantity || 0), Number(seller_id)]);
  await pool.query(
    `INSERT INTO logs (user_id, action, details)
     VALUES ($1, 'dispatch_event', $2::jsonb)`,
    [
      auth.id,
      JSON.stringify({
        dispatchId: Number(result.rows[0].id),
        sellerId: Number(seller_id),
        quantity: Number(quantity || 0),
        type: dispatchType,
      }),
    ]
  );
  return json({ ...result.rows[0], type: dispatchType });
}

async function handleBottleCheckinsGet(req: NextRequest) {
  const auth = verifyToken(req);
  if (!auth) return unauthorized();
  if (!isAdminOrIT(auth.role)) return forbidden();

  const date = req.nextUrl.searchParams.get("date");
  const sellerId = req.nextUrl.searchParams.get("sellerId");
  const where: string[] = [`l.action = 'seller_bottle_checkin'`];
  const params: Array<string | number> = [];

  if (date) {
    params.push(date);
    where.push(`to_char(timezone('${appTimeZone}', l.timestamp), 'YYYY-MM-DD') = $${params.length}`);
  }
  if (sellerId) {
    params.push(Number(sellerId));
    where.push(`(l.details->>'sellerId')::int = $${params.length}`);
  }

  const result = await pool.query(
    `SELECT l.id,
            l.timestamp,
            l.details,
            u.name AS checker_name,
            s.name AS seller_name,
            to_char(timezone('${appTimeZone}', l.timestamp), 'YYYY-MM-DD') AS local_date
     FROM logs l
     LEFT JOIN users u ON u.id = l.user_id
     LEFT JOIN users s ON s.id = (l.details->>'sellerId')::int
     WHERE ${where.join(" AND ")}
     ORDER BY l.timestamp DESC`,
    params
  );

  const rows = result.rows.map((row: any) => ({
    id: row.id,
    timestamp: row.timestamp,
    local_date: row.local_date,
    checker_name: row.checker_name,
    seller_id: Number(row.details?.sellerId || 0),
    seller_name: row.seller_name || "N/A",
    empty_count: Number(row.details?.emptyCount || 0),
    full_count: Number(row.details?.fullCount || 0),
    notes: row.details?.notes || "",
  }));
  return json(rows);
}

async function handleBottleCheckinsCreate(req: NextRequest) {
  const auth = verifyToken(req);
  if (!auth) return unauthorized();
  if (!isAdminOrIT(auth.role)) return forbidden();

  const body = await parseBody(req);
  const sellerId = Number(body.sellerId || 0);
  const emptyCount = Math.max(0, Number(body.emptyCount || 0));
  const fullCount = Math.max(0, Number(body.fullCount || 0));
  const notes = String(body.notes || "").trim();
  if (!sellerId) return json({ message: "Debe seleccionar un vendedor." }, 400);
  if (emptyCount === 0 && fullCount === 0) {
    return json({ message: "Debe ingresar al menos vacíos o llenos recibidos." }, 400);
  }

  const sellerRes = await pool.query("SELECT id FROM users WHERE id = $1 AND role = 'seller' LIMIT 1", [sellerId]);
  if (sellerRes.rows.length === 0) return json({ message: "Vendedor no encontrado." }, 404);

  await pool.query("BEGIN");
  try {
    const logRes = await pool.query(
      `INSERT INTO logs (user_id, action, details)
       VALUES ($1, 'seller_bottle_checkin', $2::jsonb)
       RETURNING id, timestamp`,
      [
        auth.id,
        JSON.stringify({
          sellerId,
          emptyCount,
          fullCount,
          notes: notes || null,
        }),
      ]
    );

    if (emptyCount > 0) {
      await pool.query(
        "UPDATE inventory SET returned = returned + $1, in_process = in_process + $1, last_updated = CURRENT_TIMESTAMP WHERE id = 1",
        [emptyCount]
      );
    }
    if (fullCount > 0) {
      await pool.query(
        "UPDATE inventory SET plant_stock = plant_stock + $1, last_updated = CURRENT_TIMESTAMP WHERE id = 1",
        [fullCount]
      );
      await pool.query(
        "UPDATE users SET current_stock = GREATEST(current_stock - $1, 0) WHERE id = $2",
        [fullCount, sellerId]
      );
    }

    await pool.query("COMMIT");
    return json({
      id: logRes.rows[0].id,
      timestamp: logRes.rows[0].timestamp,
      seller_id: sellerId,
      empty_count: emptyCount,
      full_count: fullCount,
      notes: notes || null,
    });
  } catch (err) {
    await pool.query("ROLLBACK");
    throw err;
  }
}

function parseClosureDetails(row: any) {
  const cd = row.cash_denominations || {};
  const details = cd.__closureDetails || {};
  return {
    expected_cash: Number(details.expectedCash ?? row.total_sales ?? 0),
    declared_cash: Number(details.declaredCash ?? row.total_sales ?? 0),
    difference: Number(details.difference ?? 0),
    observations: details.observations || null,
    sold_bottles: Number(details.soldBottles ?? 0),
    returned_empty_declared: Number(details.returnedEmptyDeclared ?? details.soldBottles ?? 0),
    returned_full_declared: Number(details.returnedFullDeclared ?? 0),
    loaded_initial: Number(details.loadedInitial ?? 0),
    loaded_reload: Number(details.loadedReload ?? 0),
    dispatch_count: Number(details.dispatchCount ?? 0),
  };
}

async function handleClosuresGet(req: NextRequest) {
  const auth = verifyToken(req);
  if (!auth) return unauthorized();
  const result = await pool.query(
    `SELECT c.*, u.name AS seller_name,
            to_char(timezone('${appTimeZone}', c.timestamp), 'YYYY-MM-DD') as local_date
     FROM closures c
     LEFT JOIN users u ON c.seller_id = u.id
     ORDER BY c.timestamp DESC`
  );

  const rows = [];
  for (const row of result.rows) {
    const det = parseClosureDetails(row);
    const conf = await pool.query(
      `SELECT l.*, u.name AS admin_name
       FROM logs l
       LEFT JOIN users u ON u.id = l.user_id
       WHERE l.action = 'closure_confirmation' AND (l.details->>'closureId') = $1
       ORDER BY l.timestamp DESC
       LIMIT 1`,
      [String(row.id)]
    );
    const confRow = conf.rows[0];
    const confDetails = confRow?.details || {};

    const prevClosure = await pool.query(
      `SELECT timestamp
       FROM closures
       WHERE seller_id = $1
         AND timestamp < $2
       ORDER BY timestamp DESC
       LIMIT 1`,
      [Number(row.seller_id), row.timestamp]
    );
    const prevClosureTs = prevClosure.rows[0]?.timestamp || null;

    const checkin = prevClosureTs
      ? await pool.query(
          `SELECT
             COALESCE(SUM((details->>'emptyCount')::int), 0) AS empty_total,
             COALESCE(SUM((details->>'fullCount')::int), 0) AS full_total
           FROM logs
           WHERE action = 'seller_bottle_checkin'
             AND (details->>'sellerId')::int = $1
             AND timestamp > $2
             AND timestamp <= $3`,
          [Number(row.seller_id), prevClosureTs, row.timestamp]
        )
      : await pool.query(
          `SELECT
             COALESCE(SUM((details->>'emptyCount')::int), 0) AS empty_total,
             COALESCE(SUM((details->>'fullCount')::int), 0) AS full_total
           FROM logs
           WHERE action = 'seller_bottle_checkin'
             AND (details->>'sellerId')::int = $1
             AND timestamp <= $2`,
          [Number(row.seller_id), row.timestamp]
        );
    const checkinRow = checkin.rows[0] || {};

    rows.push({
      ...row,
      ...det,
      status: confDetails.status || (det.difference === 0 ? "balanced" : "difference"),
      admin_confirmed: Boolean(confRow),
      admin_confirmed_at: confRow?.timestamp || null,
      admin_confirmed_by: confRow?.user_id || null,
      admin_name: confRow?.admin_name || null,
      returned_empty_received: Number(confDetails.returnedEmptyReceived ?? 0),
      returned_full_received: Number(confDetails.returnedFullReceived ?? 0),
      missing_bottles: Number(confDetails.missingBottles ?? 0),
      missing_justification: confDetails.missingJustification || null,
      sold_complete_confirmed: Boolean(confDetails.soldCompleteConfirmed ?? false),
      checkin_empty_total: Number(checkinRow.empty_total || 0),
      checkin_full_total: Number(checkinRow.full_total || 0),
    });
  }
  return json(rows);
}

async function handleClosuresCreate(req: NextRequest) {
  const auth = verifyToken(req);
  if (!auth) return unauthorized();
  if (auth.role !== "seller") return forbidden("Solo vendedores pueden cerrar jornada");

  const body = await parseBody(req);
  const declaredCash = Number(body.declaredCash || 0);
  const cashDenominations = body.cashDenominations || {};

  const lastClosureRes = await pool.query(
    `SELECT timestamp
     FROM closures
     WHERE seller_id = $1
     ORDER BY timestamp DESC
     LIMIT 1`,
    [auth.id]
  );
  const lastClosureTs = lastClosureRes.rows[0]?.timestamp || null;

  const soldRes = lastClosureTs
    ? await pool.query(
        `SELECT COALESCE(SUM(quantity), 0) AS sold
         FROM sales
         WHERE seller_id = $1
           AND timestamp > $2`,
        [auth.id, lastClosureTs]
      )
    : await pool.query(
        `SELECT COALESCE(SUM(quantity), 0) AS sold
         FROM sales
         WHERE seller_id = $1`,
        [auth.id]
      );
  const soldBottles = Number(soldRes.rows[0]?.sold || 0);

  const cashSalesRes = lastClosureTs
    ? await pool.query(
        `SELECT COALESCE(SUM(total_amount), 0) AS cash_total
         FROM sales
         WHERE seller_id = $1
           AND payment_type = 'cash'
           AND timestamp > $2`,
        [auth.id, lastClosureTs]
      )
    : await pool.query(
        `SELECT COALESCE(SUM(total_amount), 0) AS cash_total
         FROM sales
         WHERE seller_id = $1
           AND payment_type = 'cash'`,
        [auth.id]
      );
  const cashSalesTotal = Number(cashSalesRes.rows[0]?.cash_total || 0);

  const creditsRes = lastClosureTs
    ? await pool.query(
        `SELECT COALESCE(SUM(total_amount), 0) AS credits_total
         FROM sales
         WHERE seller_id = $1
           AND payment_type = 'credit'
           AND timestamp > $2`,
        [auth.id, lastClosureTs]
      )
    : await pool.query(
        `SELECT COALESCE(SUM(total_amount), 0) AS credits_total
         FROM sales
         WHERE seller_id = $1
           AND payment_type = 'credit'`,
        [auth.id]
      );
  const creditsTotal = Number(creditsRes.rows[0]?.credits_total || 0);

  const expensesRes = lastClosureTs
    ? await pool.query(
        `SELECT COALESCE(SUM(amount), 0) AS expenses_total
         FROM expenses
         WHERE user_id = $1
           AND timestamp > $2`,
        [auth.id, lastClosureTs]
      )
    : await pool.query(
        `SELECT COALESCE(SUM(amount), 0) AS expenses_total
         FROM expenses
         WHERE user_id = $1`,
        [auth.id]
      );
  const expensesTotal = Number(expensesRes.rows[0]?.expenses_total || 0);
  const expectedCash = cashSalesTotal - expensesTotal;
  const difference = declaredCash - expectedCash;

  const dispatchRowsRes = lastClosureTs
    ? await pool.query(
        `SELECT id, quantity, timestamp
         FROM dispatches
         WHERE seller_id = $1
           AND timestamp > $2
         ORDER BY timestamp ASC`,
        [auth.id, lastClosureTs]
      )
    : await pool.query(
        `SELECT id, quantity, timestamp
         FROM dispatches
         WHERE seller_id = $1
         ORDER BY timestamp ASC`,
        [auth.id]
      );
  const dispatchRows = dispatchRowsRes.rows || [];
  const dispatchIds = dispatchRows.map((d: any) => Number(d.id));

  const dispatchTypeById = new Map<number, "initial" | "reload">();
  if (dispatchIds.length > 0) {
    const dispatchLogRes = await pool.query(
      `SELECT details
       FROM logs
       WHERE action = 'dispatch_event'
         AND (details->>'sellerId')::int = $1
         AND (details->>'dispatchId')::int = ANY($2::int[])`,
      [auth.id, dispatchIds]
    );
    for (const row of dispatchLogRes.rows) {
      const dispatchId = Number(row.details?.dispatchId || 0);
      const type = String(row.details?.type || "") === "initial" ? "initial" : "reload";
      if (dispatchId > 0) dispatchTypeById.set(dispatchId, type);
    }
  }

  let loadedInitial = 0;
  let loadedReload = 0;
  if (dispatchRows.length > 0 && dispatchTypeById.size === 0) {
    loadedInitial = Number(dispatchRows[0]?.quantity || 0);
    loadedReload = dispatchRows.slice(1).reduce((acc: number, d: any) => acc + Number(d.quantity || 0), 0);
  } else {
    for (const d of dispatchRows) {
      const q = Number(d.quantity || 0);
      const t = dispatchTypeById.get(Number(d.id));
      if (t === "initial") loadedInitial += q;
      else loadedReload += q;
    }
    if (loadedInitial === 0) loadedInitial = Number(body.loadedInitial || 0);
  }
  const dispatchCount = dispatchRows.length;

  const closureDetails = {
    expectedCash,
    declaredCash,
    difference,
    observations: body.observations || null,
    soldBottles,
    returnedEmptyDeclared: soldBottles,
    returnedFullDeclared: Number(body.returnedFullDeclared || 0),
    loadedInitial,
    loadedReload,
    dispatchCount,
  };

  const mergedDenominations = {
    ...cashDenominations,
    __closureDetails: closureDetails,
  };

  const result = await pool.query(
    `INSERT INTO closures (seller_id, total_sales, cash_denominations, credits_total, expenses_total, shortage)
     VALUES ($1, $2, $3::jsonb, $4, $5, $6)
     RETURNING *`,
    [auth.id, expectedCash, JSON.stringify(mergedDenominations), creditsTotal, expensesTotal, Math.max(0, expectedCash - declaredCash)]
  );
  return json(result.rows[0]);
}

async function handleClosuresUpdate(req: NextRequest, closureId: string) {
  const auth = verifyToken(req);
  if (!auth) return unauthorized();
  if (!isAdminOrIT(auth.role)) return forbidden();
  const body = await parseBody(req);

  if (body.confirmReceived === true) {
    const closureRes = await pool.query("SELECT * FROM closures WHERE id = $1 LIMIT 1", [Number(closureId)]);
    const closure = closureRes.rows[0];
    if (!closure) return json({ message: "Cierre no encontrado" }, 404);
    const closureDetails = parseClosureDetails(closure);

    const soldBottles = Number(body.soldBottles ?? closureDetails.sold_bottles ?? 0);
    const returnedEmptyReceived = Number(body.returnedEmptyReceived ?? soldBottles);
    const returnedFullReceived = Number(body.returnedFullReceived ?? closureDetails.returned_full_declared ?? 0);
    const missingBottles = Math.max(0, soldBottles - returnedEmptyReceived);
    const missingJustification = String(body.missingJustification || "").trim();
    const soldCompleteConfirmed = Boolean(body.soldCompleteConfirmed);
    if (missingBottles > 0 && missingJustification.length < 5) {
      return json({ message: "Debe justificar faltantes de botellones para confirmar el cierre." }, 400);
    }

    await pool.query(
      `INSERT INTO logs (user_id, action, details)
       VALUES ($1, 'closure_confirmation', $2::jsonb)`,
      [
        auth.id,
        JSON.stringify({
          closureId,
          returnedEmptyReceived,
          returnedFullReceived,
          soldBottles,
          missingBottles,
          missingJustification: missingJustification || null,
          soldCompleteConfirmed,
          status: missingBottles > 0 ? "difference" : "balanced",
        }),
      ]
    );
    return json({ success: true });
  }

  const status = String(body.status || "difference");
  await pool.query(
    `INSERT INTO logs (user_id, action, details)
     VALUES ($1, 'closure_status', $2::jsonb)`,
    [auth.id, JSON.stringify({ closureId, status })]
  );
  return json({ success: true, status });
}

async function handleMaintenanceGet(req: NextRequest) {
  const auth = verifyToken(req);
  if (!auth) return unauthorized();
  const result = await pool.query("SELECT * FROM maintenance ORDER BY date DESC");
  const ids = result.rows.map((r: any) => Number(r.id));
  let metaById = new Map<number, any>();
  if (ids.length > 0) {
    const metaRes = await pool.query(
      `SELECT l.details, u.name AS seller_name
       FROM logs l
       LEFT JOIN users u ON u.id = (l.details->>'sellerId')::int
       WHERE l.action = 'maintenance_meta'
         AND (l.details->>'maintenanceId')::int = ANY($1::int[])`,
      [ids]
    );
    metaById = new Map<number, any>(
      metaRes.rows.map((r: any) => [Number(r.details?.maintenanceId || 0), { ...r.details, seller_name: r.seller_name || null }])
    );
  }

  const now = new Date();
  const rows = result.rows.map((r: any) => {
    const meta = metaById.get(Number(r.id)) || {};
    const next = r.next_maintenance ? new Date(r.next_maintenance) : null;
    const daysToNext = next ? Math.ceil((next.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
    return {
      ...r,
      seller_id: Number(meta.sellerId || 0) || null,
      seller_name: meta.seller_name || null,
      service_type: meta.serviceType || null,
      mileage: Number(meta.mileage || 0) || null,
      cost: Number(meta.cost || 0) || 0,
      alert_soon: typeof daysToNext === "number" ? daysToNext <= 7 : false,
      days_to_next: daysToNext,
    };
  });
  return json(rows);
}

async function handleMaintenanceCreate(req: NextRequest) {
  const auth = verifyToken(req);
  if (!auth) return unauthorized();
  if (!isAdminOrIT(auth.role)) return forbidden();
  const body = await parseBody(req);
  const { type, description, date, nextMaintenance, serviceType, mileage, sellerId, cost } = body;
  const baseDate = date ? new Date(String(date)) : new Date();
  if (Number.isNaN(baseDate.getTime())) return json({ message: "Fecha de mantenimiento inválida." }, 400);
  const normalizedServiceType = String(serviceType || "general");
  const daysToAdd = normalizedServiceType === "oil_change"
    ? 30
    : normalizedServiceType === "tire_rotation"
      ? 60
      : 0;
  const computedNext = daysToAdd > 0
    ? new Date(baseDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000)
    : (nextMaintenance ? new Date(String(nextMaintenance)) : baseDate);
  if (Number.isNaN(computedNext.getTime())) return json({ message: "Próxima fecha de mantenimiento inválida." }, 400);
  const numericCost = Number(cost || 0);

  await pool.query("BEGIN");
  try {
    const result = await pool.query(
      "INSERT INTO maintenance (type, description, date, next_maintenance) VALUES ($1, $2, $3, $4) RETURNING *",
      [type, description, baseDate.toISOString().slice(0, 10), computedNext.toISOString().slice(0, 10)]
    );
    const maintenanceId = Number(result.rows[0].id);

    await pool.query(
      `INSERT INTO logs (user_id, action, details)
       VALUES ($1, 'maintenance_meta', $2::jsonb)`,
      [
        auth.id,
        JSON.stringify({
          maintenanceId,
          serviceType: normalizedServiceType,
          mileage: Number(mileage || 0) || null,
          sellerId: Number(sellerId || 0) || null,
          cost: numericCost > 0 ? numericCost : 0,
        }),
      ]
    );

    if (numericCost > 0) {
      const receipt = `MNT-${maintenanceId}`;
      const extra = sellerId ? ` | Vendedor ID ${Number(sellerId)}` : "";
      await pool.query(
        "INSERT INTO expenses (user_id, amount, description, receipt_number) VALUES ($1, $2, $3, $4)",
        [auth.id, numericCost, `Mantenimiento: ${description}${extra}`, receipt]
      );
    }

    await pool.query("COMMIT");
    return json(result.rows[0]);
  } catch (err) {
    await pool.query("ROLLBACK");
    throw err;
  }
}

async function handleInventoryGet(req: NextRequest) {
  const auth = verifyToken(req);
  if (!auth) return unauthorized();
  const result = await pool.query("SELECT * FROM inventory WHERE id = 1");
  return json(result.rows[0] || null);
}

async function handleInventoryAdjust(req: NextRequest) {
  const auth = verifyToken(req);
  if (!auth) return unauthorized();
  if (!isAdminOrIT(auth.role)) return forbidden();
  const body = await parseBody(req);
  const { type, quantity } = body;
  const qty = Number(quantity || 0);
  if (type === "production") {
    await pool.query("UPDATE inventory SET plant_stock = plant_stock + $1, last_updated = CURRENT_TIMESTAMP WHERE id = 1", [qty]);
  } else if (type === "return") {
    await pool.query("UPDATE inventory SET returned = returned + $1, in_process = in_process + $1, last_updated = CURRENT_TIMESTAMP WHERE id = 1", [qty]);
  } else {
    return json({ message: "Tipo de ajuste inválido" }, 400);
  }
  return json({ success: true });
}

async function handleReportsGet(req: NextRequest) {
  const auth = verifyToken(req);
  if (!auth) return unauthorized();
  if (!isAdminOrIT(auth.role)) return forbidden();

  const type = String(req.nextUrl.searchParams.get("type") || "").trim();
  const start = String(req.nextUrl.searchParams.get("start") || "").trim();
  const end = String(req.nextUrl.searchParams.get("end") || "").trim();
  if (!type) return json({ message: "Debe indicar tipo de reporte." }, 400);
  const startTs = start ? `${start}T00:00:00` : null;
  const endTs = end ? `${end}T23:59:59` : null;

  if (type === "closures") {
    const result = await pool.query(
      `SELECT c.id, c.timestamp, u.name AS seller_name, c.total_sales, c.expenses_total, c.shortage
       FROM closures c
       LEFT JOIN users u ON u.id = c.seller_id
       WHERE ($1::timestamptz IS NULL OR c.timestamp >= $1::timestamptz)
         AND ($2::timestamptz IS NULL OR c.timestamp <= $2::timestamptz)
       ORDER BY c.timestamp DESC`,
      [startTs, endTs]
    );
    return json(result.rows);
  }

  if (type === "sales_by_seller") {
    const result = await pool.query(
      `SELECT s.seller_id, u.name AS seller_name,
              COUNT(*) AS sales_count,
              COALESCE(SUM(s.quantity), 0) AS bottles,
              COALESCE(SUM(s.total_amount), 0) AS amount
       FROM sales s
       LEFT JOIN users u ON u.id = s.seller_id
       WHERE ($1::timestamptz IS NULL OR s.timestamp >= $1::timestamptz)
         AND ($2::timestamptz IS NULL OR s.timestamp <= $2::timestamptz)
       GROUP BY s.seller_id, u.name
       ORDER BY amount DESC`,
      [startTs, endTs]
    );
    return json(result.rows);
  }

  if (type === "daily_expenses") {
    const result = await pool.query(
      `SELECT e.id, e.timestamp, e.amount, e.description, e.receipt_number, u.name AS user_name, u.role AS user_role
       FROM expenses e
       LEFT JOIN users u ON u.id = e.user_id
       WHERE ($1::timestamptz IS NULL OR e.timestamp >= $1::timestamptz)
         AND ($2::timestamptz IS NULL OR e.timestamp <= $2::timestamptz)
       ORDER BY e.timestamp DESC`,
      [startTs, endTs]
    );
    return json(result.rows);
  }

  if (type === "maintenance_history") {
    const result = await pool.query(
      `SELECT m.*
       FROM maintenance m
       WHERE ($1::date IS NULL OR m.date >= $1::date)
         AND ($2::date IS NULL OR m.date <= $2::date)
       ORDER BY m.date DESC`,
      [start || null, end || null]
    );
    return json(result.rows);
  }

  if (type === "inventory_current") {
    const inv = await pool.query("SELECT * FROM inventory WHERE id = 1");
    return json(inv.rows[0] || null);
  }

  if (type === "debt_customers") {
    const result = await pool.query(
      `SELECT id, name, phone, address, balance
       FROM customers
       WHERE balance > 0
       ORDER BY balance DESC`
    );
    return json(result.rows);
  }

  if (type === "seller_ranking_month") {
    const currentMonth = await pool.query(
      `SELECT date_trunc('month', timezone('${appTimeZone}', now())) AS mstart,
              (date_trunc('month', timezone('${appTimeZone}', now())) + interval '1 month' - interval '1 second') AS mend`
    );
    const mstart = currentMonth.rows[0]?.mstart;
    const mend = currentMonth.rows[0]?.mend;
    const result = await pool.query(
      `SELECT s.seller_id, u.name AS seller_name,
              COALESCE(SUM(s.quantity), 0) AS bottles,
              COALESCE(SUM(s.total_amount), 0) AS amount
       FROM sales s
       LEFT JOIN users u ON u.id = s.seller_id
       WHERE s.timestamp >= $1
         AND s.timestamp <= $2
       GROUP BY s.seller_id, u.name
       ORDER BY amount DESC`,
      [mstart, mend]
    );
    return json(result.rows);
  }

  return json({ message: "Tipo de reporte no soportado." }, 400);
}

type RouteContext = { params: Promise<{ route: string[] }> | { route: string[] } };

async function routeHandler(req: NextRequest, context: RouteContext) {
  try {
    await ensureInitialized();
    const resolved = await Promise.resolve(context.params);
    const route = resolved?.route || [];
    const pathKey = route.join("/");
    const method = req.method.toUpperCase();

    if (method === "GET" && pathKey === "health") {
      await pool.query("SELECT 1");
      return json({ ok: true });
    }

    if (method === "POST" && pathKey === "auth/login") return await handleAuthLogin(req);
    if (method === "POST" && pathKey === "auth/change-password") return await handleAuthChangePassword(req);
    if (method === "GET" && pathKey === "auth/profile") return await handleAuthProfile(req);

    if (method === "GET" && pathKey === "users") return await handleUsersGet(req);
    if (method === "POST" && pathKey === "users") return await handleUsersCreate(req);
    if (method === "POST" && /^users\/\d+\/reset-password$/.test(pathKey)) return await handleUsersResetPassword(req, pathKey.split("/")[1]);

    if (method === "GET" && pathKey === "customers") return await handleCustomersGet(req);
    if (method === "POST" && pathKey === "customers") return await handleCustomersCreate(req);
    if (method === "PUT" && /^customers\/\d+$/.test(pathKey)) return await handleCustomersUpdate(req, pathKey.split("/")[1]);

    if (method === "GET" && pathKey === "products") return await handleProductsGet(req);
    if (method === "POST" && pathKey === "products") return await handleProductsCreate(req);
    if (method === "PUT" && /^products\/\d+$/.test(pathKey)) return await handleProductsUpdate(req, pathKey.split("/")[1]);
    if (method === "DELETE" && /^products\/\d+$/.test(pathKey)) return await handleProductsDelete(req, pathKey.split("/")[1]);

    if (method === "GET" && pathKey === "sales") return await handleSalesGet(req);
    if (method === "POST" && pathKey === "sales") return await handleSalesCreate(req);

    if (method === "GET" && pathKey === "expenses") return await handleExpensesGet(req);
    if (method === "POST" && pathKey === "expenses") return await handleExpensesCreate(req);

    if (method === "GET" && pathKey === "dispatches") return await handleDispatchesGet(req);
    if (method === "POST" && pathKey === "dispatches") return await handleDispatchesCreate(req);
    if (method === "GET" && pathKey === "bottle-checkins") return await handleBottleCheckinsGet(req);
    if (method === "POST" && pathKey === "bottle-checkins") return await handleBottleCheckinsCreate(req);

    if (method === "GET" && pathKey === "closures") return await handleClosuresGet(req);
    if (method === "POST" && pathKey === "closures") return await handleClosuresCreate(req);
    if (method === "PUT" && /^closures\/\d+$/.test(pathKey)) return await handleClosuresUpdate(req, pathKey.split("/")[1]);

    if (method === "GET" && pathKey === "maintenance") return await handleMaintenanceGet(req);
    if (method === "POST" && pathKey === "maintenance") return await handleMaintenanceCreate(req);

    if (method === "GET" && pathKey === "inventory") return await handleInventoryGet(req);
    if (method === "POST" && pathKey === "inventory/adjust") return await handleInventoryAdjust(req);
    if (method === "GET" && pathKey === "reports") return await handleReportsGet(req);

    return json({ message: `Ruta API no implementada: ${method} /api/${pathKey}` }, 404);
  } catch (err) {
    return serverError(err);
  }
}

export async function GET(req: NextRequest, context: RouteContext) {
  return routeHandler(req, context);
}
export async function POST(req: NextRequest, context: RouteContext) {
  return routeHandler(req, context);
}
export async function PUT(req: NextRequest, context: RouteContext) {
  return routeHandler(req, context);
}
export async function DELETE(req: NextRequest, context: RouteContext) {
  return routeHandler(req, context);
}
