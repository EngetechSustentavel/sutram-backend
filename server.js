const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");

const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(cors());

// --- SEUS DADOS DO BANCO (Preencha aqui!) ---
const pool = mysql.createPool({
  host: "da.linknacional.com", // Host da sua hospedagem
  user: "sidehhwg_engetech-1", // Seu usuário
  password: "Engetech2025@#", // <<--- NÃO ESQUEÇA A SENHA
  database: "sidehhwg_engetech-1", // Seu banco
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// 1. ROTA DE LOGIN
app.post("/api/login", async (req, res) => {
  try {
    const { usuario, senha } = req.body;
    // Verifica se usuário existe
    const [rows] = await pool.query(
      "SELECT * FROM usuarios WHERE usuario = ? AND senha = ?",
      [usuario, senha]
    );

    if (rows.length > 0) {
      res.json({ msg: "Login OK", user: rows[0].usuario });
    } else {
      res.status(401).json({ erro: "Acesso Negado" });
    }
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

// 2. CRIAR / IMPORTAR (Correção Importante)
app.post("/api/protocolos", async (req, res) => {
  try {
    // A. Importação em Massa (CSV)
    if (Array.isArray(req.body)) {
      for (const p of req.body) {
        // Gera ID se não tiver
        const ano = new Date().getFullYear();
        const num = Math.floor(10000 + Math.random() * 90000);
        const letra = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".charAt(
          Math.floor(Math.random() * 26)
        );
        const regAuto = `${ano}-${num}${letra}`;

        await pool.execute(
          `INSERT INTO protocolos (registro, data_entrada, solicitante, endereco, zona, objeto, quantidade, status) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            p.registro || regAuto,
            p.data || "",
            p.solicitante || "",
            p.endereco || "",
            p.zona || "Geral",
            p.objeto || "Importado",
            Number(p.quantidade) || 1,
            "Recebido",
          ]
        );
      }
      return res.json({ msg: "Importação concluída" });
    }

    // B. Único Registro
    const {
      solicitante,
      endereco,
      zona,
      objeto,
      quantidade,
      mesExtenso,
      data,
    } = req.body;

    // Gera ID
    const ano = new Date().getFullYear();
    const num = Math.floor(10000 + Math.random() * 90000);
    const letra = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".charAt(
      Math.floor(Math.random() * 26)
    );
    const registro = `${ano}-${num}${letra}`;

    await pool.execute(
      `INSERT INTO protocolos (registro, data_entrada, solicitante, endereco, zona, objeto, quantidade, mes_extenso, status) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        registro,
        data,
        solicitante,
        endereco,
        zona,
        objeto,
        quantidade,
        mesExtenso,
        "Recebido",
      ]
    );

    res.status(201).json({ msg: "Criado" });
  } catch (error) {
    console.error(error);
    res.status(400).json({ erro: error.message });
  }
});

// 3. LISTAR
app.get("/api/protocolos", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM protocolos ORDER BY id DESC"
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

// 4. ATUALIZAR
app.put("/api/protocolos/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { solicitante, endereco, zona, objeto, quantidade, status } =
      req.body;

    // Monta atualização dinâmica
    let queryParts = [];
    let params = [];
    if (solicitante) {
      queryParts.push("solicitante=?");
      params.push(solicitante);
    }
    if (endereco) {
      queryParts.push("endereco=?");
      params.push(endereco);
    }
    if (zona) {
      queryParts.push("zona=?");
      params.push(zona);
    }
    if (objeto) {
      queryParts.push("objeto=?");
      params.push(objeto);
    }
    if (quantidade) {
      queryParts.push("quantidade=?");
      params.push(quantidade);
    }
    if (status) {
      queryParts.push("status=?");
      params.push(status);
    }

    params.push(id);

    await pool.execute(
      `UPDATE protocolos SET ${queryParts.join(", ")} WHERE id=?`,
      params
    );
    res.json({ msg: "Atualizado" });
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

// 5. DELETAR
app.delete("/api/protocolos/:id", async (req, res) => {
  await pool.execute("DELETE FROM protocolos WHERE id = ?", [req.params.id]);
  res.json({ msg: "Deletado" });
});

// 6. DELETAR TUDO
app.delete("/api/protocolos-todos", async (req, res) => {
  await pool.execute("TRUNCATE TABLE protocolos");
  res.json({ msg: "Limpo" });
});

// 7. SUGESTÕES
app.get("/api/sugestoes/:campo", async (req, res) => {
  const campo = req.params.campo === "solicitante" ? "solicitante" : "endereco";
  const [rows] = await pool.query(`SELECT DISTINCT ${campo} FROM protocolos`);
  res.json(rows.map((r) => r[campo]));
});

app.listen(5000, () => console.log("🚀 Servidor rodando na porta 5000"));
