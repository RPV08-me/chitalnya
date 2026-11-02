const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { sql, poolPromise } = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/register', async (req, res) => {
    const { surname, name, patronymic, phone, email, password } = req.body;
    try {
        const pool = await poolPromise;

        const check = await pool.request()
            .input('email', sql.NVarChar, email)
            .query('SELECT id FROM users WHERE email = @email');
        if (check.recordset.length > 0) {
            return res.status(400).json({ error: 'Эта почта уже зарегистрирована' });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const last = await pool.request().query('SELECT TOP 1 id FROM users ORDER BY id DESC');
        const nextNumber = String((last.recordset[0]?.id || 0) + 1).padStart(4, '0');

        await pool.request()
            .input('ticket', sql.NVarChar, nextNumber)
            .input('surname', sql.NVarChar, surname)
            .input('name', sql.NVarChar, name)
            .input('patronymic', sql.NVarChar, patronymic)
            .input('phone', sql.NVarChar, phone)
            .input('email', sql.NVarChar, email)
            .input('hash', sql.NVarChar, passwordHash)
            .query(`INSERT INTO users (ticket_number, surname, name, patronymic, phone, email, password_hash) 
                    VALUES (@ticket, @surname, @name, @patronymic, @phone, @email, @hash)`);

        res.json({ success: true, ticket_number: nextNumber });
    } catch (err) {
        console.error('Ошибка при регестрации:', err.message); 
        res.status(500).json({ error: 'Ошибка сервера при регистрации: ' + err.message });
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('email', sql.NVarChar, email)
            .query('SELECT * FROM users WHERE email = @email');
        
        const user = result.recordset[0];
        if (!user) return res.status(400).json({ error: 'Пользователь не найден' });

        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) return res.status(400).json({ error: 'Неверный пароль' });

        res.json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                surname: user.surname,
                patronymic: user.patronymic,
                email: user.email,
                phone: user.phone,
                ticket_number: user.ticket_number
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера при входе' });
    }
});

app.post('/api/users/:id/update', async (req, res) => {
    const userId = req.params.id;
    const { surname, name, patronymic, phone, email } = req.body;
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, userId)
            .input('surname', sql.NVarChar, surname)
            .input('name', sql.NVarChar, name)
            .input('patronymic', sql.NVarChar, patronymic)
            .input('phone', sql.NVarChar, phone)
            .input('email', sql.NVarChar, email)
            .query(`UPDATE users SET surname=@surname, name=@name, patronymic=@patronymic, 
                    phone=@phone, email=@email WHERE id=@id`);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка при обновлении профиля' });
    }
});

app.get('/api/books', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT * FROM books');
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка при загрузке книг' });
    }
});

app.post('/api/books/:id/reserve', async (req, res) => {
    const bookId = req.params.id;
    const { userId } = req.body; 
    
    try {
        const pool = await poolPromise;
        
        const check = await pool.request()
            .input('id', sql.Int, bookId)
            .query('SELECT available_copies FROM books WHERE id = @id');
        
        if (check.recordset.length === 0) return res.status(404).json({ error: 'Книга не найдена' });
        if (check.recordset[0].available_copies < 1) return res.status(400).json({ error: 'Нет доступных экземпляров' });

        await pool.request()
            .input('userId', sql.Int, userId)
            .input('bookId', sql.Int, bookId)
            .query(`INSERT INTO loans (user_id, book_id, status) 
                    VALUES (@userId, @bookId, 'reserved')`);

        await pool.request()
            .input('bookId', sql.Int, bookId)
            .query('UPDATE books SET available_copies = available_copies - 1 WHERE id = @bookId');

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка при бронировании: ' + err.message });
    }
});

app.get('/api/users/:id/loans', async (req, res) => {
    const userId = req.params.id;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .query(`
                SELECT l.id, l.status, b.title, b.author, b.cover_url 
                FROM loans l
                JOIN books b ON l.book_id = b.id
                WHERE l.user_id = @userId
            `);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка при загрузке книг пользователя' });
    }
});

const PORT = 3000;
app.use(express.static(__dirname));
app.listen(PORT, () => console.log(`Сервер запущен: http://localhost:${PORT}`));