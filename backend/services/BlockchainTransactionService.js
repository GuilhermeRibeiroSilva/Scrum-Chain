const { pool } = require('../config/database');


class BlockchainTransactionService {
  

  static async create({
    transactionHash,
    transactionType,
    contractName,
    methodName,
    description,
    userAddress,
    userId,
    teamId,
    itemId,
    gasUsed,
    gasPrice,
    blockNumber,
    network = 'localhost',
    status = 'pending'
  }) {
    const client = await pool.connect();
    
    try {
      const query = `
        INSERT INTO blockchain_transactions (
          transaction_hash, transaction_type, contract_name, method_name,
          description, user_address, user_id, team_id, item_id,
          gas_used, gas_price, block_number, network, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
      `;
      
      const values = [
        transactionHash, transactionType, contractName, methodName,
        description, userAddress, userId, teamId, itemId,
        gasUsed, gasPrice, blockNumber, network, status
      ];
      
      const result = await client.query(query, values);
      return result.rows[0];
      
    } finally {
      client.release();
    }
  }
  
 
  static async updateStatus(transactionHash, status, blockNumber = null, gasUsed = null, errorMessage = null) {
    const client = await pool.connect();
    
    try {
      let query = `
        UPDATE blockchain_transactions 
        SET status = $1, updated_at = CURRENT_TIMESTAMP
      `;
      let values = [status];
      let paramIndex = 2;
      
      if (status === 'confirmed') {
        query += `, confirmed_at = CURRENT_TIMESTAMP`;
      }
      
      if (blockNumber !== null) {
        query += `, block_number = $${paramIndex}`;
        values.push(blockNumber);
        paramIndex++;
      }
      
      if (gasUsed !== null) {
        query += `, gas_used = $${paramIndex}`;
        values.push(gasUsed);
        paramIndex++;
      }
      
      if (errorMessage !== null) {
        query += `, error_message = $${paramIndex}`;
        values.push(errorMessage);
        paramIndex++;
      }
      
      query += ` WHERE transaction_hash = $${paramIndex} RETURNING *`;
      values.push(transactionHash);
      
      const result = await client.query(query, values);
      return result.rows[0];
      
    } finally {
      client.release();
    }
  }
  
  
  static async findByUser(userId, filters = {}) {
    const client = await pool.connect();
    
    try {
      console.log('🔍 [BlockchainTransactionService] findByUser - userId:', userId);
      
      // Busca transações de todas as equipes onde o usuário é membro
      let query = `
        SELECT DISTINCT
          bt.*,
          u.username,
          u.full_name,
          g.name as team_name
        FROM blockchain_transactions bt
        LEFT JOIN users u ON bt.user_id = u.id
        LEFT JOIN groups g ON bt.team_id = g.id
        WHERE (
          bt.team_id IN (
            SELECT group_id 
            FROM group_members 
            WHERE user_id = $1
          )
          OR bt.team_id IS NULL
        )
      `;
      
      let values = [userId];
      let paramIndex = 2;
      
      
      if (filters.transactionType) {
        query += ` AND bt.transaction_type = $${paramIndex}`;
        values.push(filters.transactionType);
        paramIndex++;
      }
      
      if (filters.contractName) {
        query += ` AND bt.contract_name = $${paramIndex}`;
        values.push(filters.contractName);
        paramIndex++;
      }
      
      if (filters.status) {
        query += ` AND bt.status = $${paramIndex}`;
        values.push(filters.status);
        paramIndex++;
      }
      
      if (filters.startDate) {
        query += ` AND bt.created_at >= $${paramIndex}`;
        values.push(filters.startDate);
        paramIndex++;
      }
      
      if (filters.endDate) {
        query += ` AND bt.created_at <= $${paramIndex}`;
        values.push(filters.endDate);
        paramIndex++;
      }
      
      query += ` ORDER BY bt.created_at DESC`;
      
      if (filters.limit) {
        query += ` LIMIT $${paramIndex}`;
        values.push(filters.limit);
        paramIndex++;
      }
      
      if (filters.offset) {
        query += ` OFFSET $${paramIndex}`;
        values.push(filters.offset);
      }
      
      const result = await client.query(query, values);
      return result.rows;
      
    } finally {
      client.release();
    }
  }
  
 
  static async findByTeam(teamId, filters = {}) {
    const client = await pool.connect();
    
    try {
      console.log('🔍 [BlockchainTransactionService] findByTeam - Parâmetros recebidos:');
      console.log('📊 teamId:', teamId);
      console.log('🔧 filters:', filters);
      
      let query = `
        SELECT 
          bt.*,
          u.username,
          u.full_name
        FROM blockchain_transactions bt
        LEFT JOIN users u ON bt.user_id = u.id
        WHERE bt.team_id = $1
      `;
      
      let values = [teamId];
      let paramIndex = 2;
      
      
      if (filters.transactionType) {
        console.log('🎯 Aplicando filtro de transactionType:', filters.transactionType);
        query += ` AND bt.transaction_type = $${paramIndex}`;
        values.push(filters.transactionType);
        paramIndex++;
      }
      
      if (filters.status) {
        console.log('🎯 Aplicando filtro de status:', filters.status);
        query += ` AND bt.status = $${paramIndex}`;
        values.push(filters.status);
        paramIndex++;
      }
      
      query += ` ORDER BY bt.created_at DESC`;
      
      if (filters.limit) {
        query += ` LIMIT $${paramIndex}`;
        values.push(filters.limit);
        paramIndex++;
      }
      
      if (filters.offset) {
        query += ` OFFSET $${paramIndex}`;
        values.push(filters.offset);
      }
      
      console.log('📝 Query SQL final:', query);
      console.log('🔢 Valores:', values);
      
      const result = await client.query(query, values);
      
      console.log(`📊 Resultado: ${result.rows.length} transações encontradas`);
      
      
      if (result.rows.length > 0) {
        const uniqueTypes = [...new Set(result.rows.map(row => row.transaction_type))];
        console.log('🏷️ Tipos de transação encontrados na consulta:', uniqueTypes);
      }
      
      
      if (filters.transactionType) {
        const debugQuery = `
          SELECT DISTINCT transaction_type 
          FROM blockchain_transactions 
          WHERE team_id = $1 
          ORDER BY transaction_type
        `;
        const debugResult = await client.query(debugQuery, [teamId]);
        console.log('🔎 Todos os tipos disponíveis no banco para esta equipe:', debugResult.rows.map(r => r.transaction_type));
      }
      
      return result.rows;
      
    } finally {
      client.release();
    }
  }
  
 
  static async findAll(filters = {}) {
    const client = await pool.connect();
    
    try {
      let query = `
        SELECT 
          bt.*,
          u.username,
          u.full_name
        FROM blockchain_transactions bt
        LEFT JOIN users u ON bt.user_id = u.id
        WHERE 1=1
      `;
      
      let values = [];
      let paramIndex = 1;
      
      
      if (filters.transactionType) {
        query += ` AND bt.transaction_type = $${paramIndex}`;
        values.push(filters.transactionType);
        paramIndex++;
      }
      
      if (filters.contractName) {
        query += ` AND bt.contract_name = $${paramIndex}`;
        values.push(filters.contractName);
        paramIndex++;
      }
      
      if (filters.status) {
        query += ` AND bt.status = $${paramIndex}`;
        values.push(filters.status);
        paramIndex++;
      }
      
      if (filters.userAddress) {
        query += ` AND bt.user_address = $${paramIndex}`;
        values.push(filters.userAddress);
        paramIndex++;
      }
      
      if (filters.startDate) {
        query += ` AND bt.created_at >= $${paramIndex}`;
        values.push(filters.startDate);
        paramIndex++;
      }
      
      if (filters.endDate) {
        query += ` AND bt.created_at <= $${paramIndex}`;
        values.push(filters.endDate);
        paramIndex++;
      }
      
      query += ` ORDER BY bt.created_at DESC`;
      
      if (filters.limit) {
        query += ` LIMIT $${paramIndex}`;
        values.push(filters.limit);
        paramIndex++;
      }
      
      if (filters.offset) {
        query += ` OFFSET $${paramIndex}`;
        values.push(filters.offset);
      }
      
      const result = await client.query(query, values);
      return result.rows;
      
    } finally {
      client.release();
    }
  }
  
  
  static async count(filters = {}) {
    const client = await pool.connect();
    
    try {
      let query = `SELECT COUNT(*) as total FROM blockchain_transactions WHERE 1=1`;
      let values = [];
      let paramIndex = 1;
      
      // Se userId for fornecido, conta transações de todas as equipes do usuário
      if (filters.userId) {
        query += ` AND team_id IN (
          SELECT group_id 
          FROM group_members 
          WHERE user_id = $${paramIndex}
        )`;
        values.push(filters.userId);
        paramIndex++;
      }
      
      if (filters.teamId) {
        query += ` AND team_id = $${paramIndex}`;
        values.push(filters.teamId);
        paramIndex++;
      }
      
      if (filters.transactionType) {
        query += ` AND transaction_type = $${paramIndex}`;
        values.push(filters.transactionType);
        paramIndex++;
      }
      
      if (filters.status) {
        query += ` AND status = $${paramIndex}`;
        values.push(filters.status);
        paramIndex++;
      }
      
      const result = await client.query(query, values);
      return parseInt(result.rows[0].total);
      
    } finally {
      client.release();
    }
  }
  
 
  static async deleteById(id) {
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        'DELETE FROM blockchain_transactions WHERE id = $1 RETURNING *',
        [id]
      );
      return result.rows[0];
      
    } finally {
      client.release();
    }
  }
  
  
  static async deleteAll() {
    const client = await pool.connect();
    
    try {
      const result = await client.query('DELETE FROM blockchain_transactions RETURNING count(*)');
      return result.rowCount;
      
    } finally {
      client.release();
    }
  }
  
 
  static async getStats(filters = {}) {
    const client = await pool.connect();
    
    try {
      let baseQuery = `FROM blockchain_transactions WHERE 1=1`;
      let values = [];
      let paramIndex = 1;
      
      // Se userId for fornecido, estatísticas de todas as equipes do usuário
      if (filters.userId) {
        baseQuery += ` AND team_id IN (
          SELECT group_id 
          FROM group_members 
          WHERE user_id = $${paramIndex}
        )`;
        values.push(filters.userId);
        paramIndex++;
      }
      
      if (filters.teamId) {
        baseQuery += ` AND team_id = $${paramIndex}`;
        values.push(filters.teamId);
        paramIndex++;
      }
      
      const query = `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
          COUNT(DISTINCT transaction_type) as unique_types,
          COUNT(DISTINCT contract_name) as unique_contracts
        ${baseQuery}
      `;
      
      const result = await client.query(query, values);
      return result.rows[0];
      
    } finally {
      client.release();
    }
  }
  

  static async findByItemId(itemId) {
    const client = await pool.connect();
    
    try {
      const query = `
        SELECT * FROM blockchain_transactions 
        WHERE item_id = $1 
        ORDER BY created_at DESC 
        LIMIT 1
      `;
      
      const result = await client.query(query, [itemId]);
      return result.rows[0] || null;
      
    } finally {
      client.release();
    }
  }
}

module.exports = BlockchainTransactionService;
