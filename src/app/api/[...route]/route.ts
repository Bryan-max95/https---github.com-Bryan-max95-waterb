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

if (!dbUrl) {
  throw new Error("DATABASE_URL is required");
}

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
      `
      INSERT INTO users (name, email, role, password_hash, id_number, status)
      VALUES ('IT Admin', $1, 'it', $2, '000000', 'active')
      ON CONFLICT (email) DO UPDATE SET password_hash = $2
      `,
      [itEmail, hashedPassword]
    );

    await pool.query("ALTER TABLE products ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'botellon'");
    await pool.query("ALTER TABLE expenses ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'other'");
    await pool.query("ALTER TABLE expenses ADD COLUMN IF NOT EXISTS date DATE");
    await pool.query("ALTER TABLE dispatches ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'initial'");
    await pool.query("ALTER TABLE dispatches ADD COLUMN IF NOT EXISTS notes TEXT");
    await pool.query("ALTER TABLE closures ADD COLUMN IF NOT EXISTS expected_cash DECIMAL(10,2) DEFAULT 0");
    await pool.query("ALTER TABLE closures ADD COLUMN IF NOT EXISTS declared_cash DECIMAL(10,2) DEFAULT 0");
    await pool.query("ALTER TABLE closures ADD COLUMN IF NOT EXISTS difference DECIMAL(10,2) DEFAULT 0");
    await pool.query("ALTER TABLE closures ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'difference'");
    await pool.query("ALTER TABLE closures ADD COLUMN IF NOT EXISTS observations TEXT");
    await pool.query("ALTER TABLE closures ADD COLUMN IF NOT EXISTS date DATE DEFAULT CURRENT_DATE");
    await pool.query("ALTER TABLE closures ADD COLUMN IF NOT EXISTS admin_confirmed BOOLEAN DEFAULT FALSE");
    await pool.query("ALTER TABLE closures ADD COLUMN IF NOT EXISTS admin_confirmed_at TIMESTAMP WITH TIME ZONE");
    await pool.query("ALTER TABLE closures ADD COLUMN IF NOT EXISTS admin_confirmed_by INTEGER");
    await pool.query(
      "ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_type_check"
    );
    await pool.query(
      "ALTER TABLE customers ADD CONSTRAINT customers_type_check CHECK (type IN ('individual','company','regular','frequent','credit'))"
    );
    await pool.query("UPDATE products SET category = COALESCE(category, 'botellon')");
    await pool.query("UPDATE expenses SET date = COALESCE(date, timestamp::date)");
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
  const t = String(type || "").toLowerCase();
  if (["individual", "company", "regular", "frequent", "credit"].includes(t)) return t;
  return "regular";
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

  if (!identifier || !password) {
    return json({ message: "Debe enviar usuario y contraseña" }, 400);
  }

  const result = await pool.query(
    "SELECT * FROM users WHERE email = $1 OR id_number = $1 OR (role = 'it' AND UPPER($1) = 'IT')",
    [identifier]
  );

  if (result.rows.length === 0) {
    return json({ message: "Credenciales inválidas" }, 401);
  }

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

  let idNumber = "";
  let isUnique = false;
  while (!isUnique) {
    idNumber = Math.floor(100000 + Math.random() * 900000).toString();
    const check = await pool.query("SELECT id FROM users WHERE id_number = $1", [idNumber]);
    if (check.rows.length === 0) isUnique = true;
  }

  const tempPassword = Math.floor(1000 + Math.random() * 9000).toString();
  const hashedPassword = await bcrypt.hash(tempPassword, 10);

  const result = await pool.query(
    `INSERT INTO users (name, email, role, password_hash, id_number, temp_password, must_change_password, zone, vehicle, current_correlative, correlative_end)
     VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7, $8, $9, $10) RETURNING id, id_number, temp_password`,
    [name, email, role, hashedPassword, idNumber, tempPassword, zone, vehicle, correlativeStart, correlativeEnd]
  );
  return json(result.rows[0]);
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
    [name, normalizeCustomerType(type), rtn, phone, address, Number(balance || 0)]
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
  const result = await pool.query("SELECT * FROM products ORDER BY name ASC");
  return json(result.rows);
}

async function handleProductsCreate(req: NextRequest) {
  const auth = verifyToken(req);
  if (!auth) return unauthorized();
  if (!isAdminOrIT(auth.role)) return forbidden();
  const body = await parseBody(req);
  const { name, description, price, category } = body;
  const result = await pool.query(
    "INSERT INTO products (name, description, price, category) VALUES ($1, $2, $3, $4) RETURNING *",
    [name, description, price, category || "botellon"]
  );
  return json(result.rows[0]);
}

async function handleProductsUpdate(req: NextRequest, productId: string) {
  const auth = verifyToken(req);
  if (!auth) return unauthorized();
  if (!isAdminOrIT(auth.role)) return forbidden();
  const body = await parseBody(req);
  const { name, description, price, category } = body;
  const result = await pool.query(
    `UPDATE products
     SET name = $1, description = $2, price = $3, category = $4
     WHERE id = $5
     RETURNING *`,
    [name, description || null, Number(price || 0), category || "botellon", productId]
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
    SELECT s.*, c.name as customer_name, u.name as seller_name, p.name as product_name
    FROM sales s
    JOIN customers c ON s.customer_id = c.id
    JOIN users u ON s.seller_id = u.id
    JOIN products p ON s.product_id = p.id
  `;
  const params: Array<string | number> = [];
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

    await pool.query("UPDATE users SET current_stock = current_stock - $1, current_correlative = $2 WHERE id = $3", [
      q,
      correlative,
      auth.id,
    ]);

    if (isCredit) {
      await pool.query("UPDATE customers SET balance = balance + $1 WHERE id = $2", [totalAmount, customerId]);
    }

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
  const { amount, description, receiptNumber, category, date } = body;
  const result = await pool.query(
    "INSERT INTO expenses (user_id, amount, description, receipt_number, category, date) VALUES ($1, $2, $3, $4, $5, COALESCE($6::date, CURRENT_DATE)) RETURNING *",
    [auth.id, amount, description, receiptNumber || null, category || "other", date || null]
  );
  return json(result.rows[0]);
}

async function handleExpensesGet(req: NextRequest) {
  const auth = verifyToken(req);
  if (!auth) return unauthorized();
  const result = await pool.query(
    "SELECT *, COALESCE(date, timestamp::date) AS date FROM expenses ORDER BY COALESCE(date, timestamp::date) DESC, id DESC"
  );
  return json(result.rows);
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
  return json(result.rows);
}

async function handleDispatchesCreate(req: NextRequest) {
  const auth = verifyToken(req);
  if (!auth) return unauthorized();
  if (!isAdminOrIT(auth.role)) return forbidden();
  const body = await parseBody(req);
  const { seller_id, quantity, type } = body;
  const result = await pool.query(
    "INSERT INTO dispatches (seller_id, product_id, quantity, type) VALUES ($1, NULL, $2, $3) RETURNING *",
    [Number(seller_id), Number(quantity || 0), type || "initial"]
  );
  await pool.query("UPDATE users SET current_stock = current_stock + $1 WHERE id = $2", [
    Number(quantity || 0),
    Number(seller_id),
  ]);
  return json(result.rows[0]);
}

async function handleClosuresGet(req: NextRequest) {
  const auth = verifyToken(req);
  if (!auth) return unauthorized();
  const result = await pool.query(
    `SELECT c.*, u.name AS seller_name, a.name AS admin_name
     FROM closures c
     LEFT JOIN users u ON c.seller_id = u.id
     LEFT JOIN users a ON c.admin_confirmed_by = a.id
     ORDER BY c.timestamp DESC`
  );
  return json(result.rows);
}

async function handleClosuresCreate(req: NextRequest) {
  const auth = verifyToken(req);
  if (!auth) return unauthorized();
  if (auth.role !== "seller") return forbidden("Solo vendedores pueden cerrar jornada");

  const body = await parseBody(req);
  const expectedCash = Number(body.expectedCash || 0);
  const declaredCash = Number(body.declaredCash || 0);
  const difference = declaredCash - expectedCash;
  const status = difference === 0 ? "balanced" : "difference";
  const creditsTotal = Number(body.creditsTotal || 0);
  const expensesTotal = Number(body.expensesTotal || 0);
  const cashDenominations = body.cashDenominations || {};

  const result = await pool.query(
    `INSERT INTO closures (seller_id, total_sales, cash_denominations, credits_total, expenses_total, shortage, expected_cash, declared_cash, difference, status, observations, date)
     VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_DATE)
     RETURNING *`,
    [
      auth.id,
      expectedCash,
      JSON.stringify(cashDenominations),
      creditsTotal,
      expensesTotal,
      Math.abs(difference),
      expectedCash,
      declaredCash,
      difference,
      status,
      body.observations || null,
    ]
  );

  return json(result.rows[0]);
}

async function handleClosuresUpdate(req: NextRequest, closureId: string) {
  const auth = verifyToken(req);
  if (!auth) return unauthorized();
  if (!isAdminOrIT(auth.role)) return forbidden();
  const body = await parseBody(req);

  let result;
  if (body.confirmReceived === true) {
    result = await pool.query(
      "UPDATE closures SET admin_confirmed = TRUE, admin_confirmed_at = CURRENT_TIMESTAMP, admin_confirmed_by = $1 WHERE id = $2 RETURNING *",
      [auth.id, closureId]
    );
  } else {
    const status = String(body.status || "difference");
    result = await pool.query(
      "UPDATE closures SET status = $1 WHERE id = $2 RETURNING *",
      [status, closureId]
    );
  }

  if (result.rows.length === 0) return json({ message: "Cierre no encontrado" }, 404);
  return json(result.rows[0]);
}

async function handleMaintenanceGet(req: NextRequest) {
  const auth = verifyToken(req);
  if (!auth) return unauthorized();
  const result = await pool.query("SELECT * FROM maintenance ORDER BY date DESC");
  return json(result.rows);
}

async function handleMaintenanceCreate(req: NextRequest) {
  const auth = verifyToken(req);
  if (!auth) return unauthorized();
  if (!isAdminOrIT(auth.role)) return forbidden();
  const body = await parseBody(req);
  const { type, description, date, nextMaintenance } = body;
  const result = await pool.query(
    "INSERT INTO maintenance (type, description, date, next_maintenance) VALUES ($1, $2, $3, $4) RETURNING *",
    [type, description, date, nextMaintenance]
  );
  return json(result.rows[0]);
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
    await pool.query(
      "UPDATE inventory SET plant_stock = plant_stock + $1, last_updated = CURRENT_TIMESTAMP WHERE id = 1",
      [qty]
    );
  } else if (type === "return") {
    await pool.query(
      "UPDATE inventory SET returned = returned + $1, in_process = in_process + $1, last_updated = CURRENT_TIMESTAMP WHERE id = 1",
      [qty]
    );
  } else {
    return json({ message: "Tipo de ajuste inválido" }, 400);
  }

  return json({ success: true });
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
    if (method === "POST" && /^users\/\d+\/reset-password$/.test(pathKey)) {
      const userId = pathKey.split("/")[1];
      return await handleUsersResetPassword(req, userId);
    }

    if (method === "GET" && pathKey === "customers") return await handleCustomersGet(req);
    if (method === "POST" && pathKey === "customers") return await handleCustomersCreate(req);
    if (method === "PUT" && /^customers\/\d+$/.test(pathKey)) {
      const customerId = pathKey.split("/")[1];
      return await handleCustomersUpdate(req, customerId);
    }

    if (method === "GET" && pathKey === "products") return await handleProductsGet(req);
    if (method === "POST" && pathKey === "products") return await handleProductsCreate(req);
    if (method === "PUT" && /^products\/\d+$/.test(pathKey)) {
      const productId = pathKey.split("/")[1];
      return await handleProductsUpdate(req, productId);
    }
    if (method === "DELETE" && /^products\/\d+$/.test(pathKey)) {
      const productId = pathKey.split("/")[1];
      return await handleProductsDelete(req, productId);
    }

    if (method === "GET" && pathKey === "sales") return await handleSalesGet(req);
    if (method === "POST" && pathKey === "sales") return await handleSalesCreate(req);

    if (method === "GET" && pathKey === "expenses") return await handleExpensesGet(req);
    if (method === "POST" && pathKey === "expenses") return await handleExpensesCreate(req);

    if (method === "GET" && pathKey === "dispatches") return await handleDispatchesGet(req);
    if (method === "POST" && pathKey === "dispatches") return await handleDispatchesCreate(req);

    if (method === "GET" && pathKey === "closures") return await handleClosuresGet(req);
    if (method === "POST" && pathKey === "closures") return await handleClosuresCreate(req);
    if (method === "PUT" && /^closures\/\d+$/.test(pathKey)) {
      const closureId = pathKey.split("/")[1];
      return await handleClosuresUpdate(req, closureId);
    }

    if (method === "GET" && pathKey === "maintenance") return await handleMaintenanceGet(req);
    if (method === "POST" && pathKey === "maintenance") return await handleMaintenanceCreate(req);

    if (method === "GET" && pathKey === "inventory") return await handleInventoryGet(req);
    if (method === "POST" && pathKey === "inventory/adjust") return await handleInventoryAdjust(req);

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
