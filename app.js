const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');

const { apology, loginRequired, lookup } = require('./helpers');

const app = express();

// Configure session
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true
}));

app.use(flash());

const db = new sqlite3.Database('./database.db', (err) => {
    if (err) {
        console.error('Database connection error:', err.message);
    } else {
        console.log('Connected to SQLite database.');
    }
});



// Configure session to use filesystem storage
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: false
}));

// Configure SQLite database
    db = new sqlite3.Database('./project.db', (err) => {
    if (err) {
        console.error('Database connection error:', err.message);
    } else {
        console.log('Connected to SQLite database.');
    }
});

// Middleware to prevent caching
app.use((req, res, next) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Expires", "0");
    res.setHeader("Pragma", "no-cache");
    next();
});




app.use(express.urlencoded({ extended: true }));

// Configure session
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: false
}));



// Route handler
app.post('/', loginRequired, (req, res) => {
    const userId = req.session.user_id;
    
    if (!userId) {
        return res.redirect('/login');
    }

    const { name, age, disease, symbol } = req.body;

    if (!name) return apology(res, "You forgot to add a child");
    if (!age) return apology(res, "Lack of information");
    if (!disease) return apology(res, "Lack of information");

    db.run(
        "INSERT INTO children (name, age, disease, specialty_in_need, family_id) VALUES (?, ?, ?, ?, ?)",
        [name, age, disease, symbol, userId],
        function (err) {
            if (err) {
                return apology(res, "This child already exists");
            }

            req.flash("New baby successfully added!");
            db.all("SELECT * FROM Doctors WHERE Specialty = ?", [symbol], (err, doctors) => {
                if (err) return apology(res, "Database error");
                res.render('doctors.html', { doctors });
            });
        }
    );
});

app.get('/', loginRequired, (req, res) => {
    const userId = req.session.user_id;

    if (!userId) {
        return res.redirect('/login');
    }

    db.all("SELECT * FROM children WHERE family_id = ? ORDER BY age", [userId], (err, children) => {
        if (err) return apology(res, "Database error");

        db.all("SELECT DISTINCT(specialty) FROM Doctors ORDER BY Specialty", [], (err, specialties) => {
            if (err) return apology(res, "Database error");

            res.render('index.html', { children, specialties });
        });
    });
});


app.use(express.urlencoded({ extended: true }));
app.use(flash());

// Configure session management
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: false
}));




// Doctors route
app.post('/doctors', loginRequired, (req, res) => {
    const childId = req.body.form_id;

    db.get("SELECT specialty_in_need FROM children WHERE id = ?", [childId], (err, specialty) => {
        if (err || !specialty) return apology(res, "Specialty not found");

        db.all("SELECT * FROM Doctors WHERE Specialty = ?", [specialty.specialty_in_need], (err, doctors) => {
            if (err) return apology(res, "Database error");

            res.render("doctors.html", { doctors });
        });
    });
});

app.get('/doctors', loginRequired, (req, res) => {
    res.render("doctors.html");
});

// Login route
app.post('/login', (req, res) => {
    req.session.destroy(); // Forget any user_id

    const familyName = req.body.family_name;
    const password = req.body.password;

    if (!familyName) return apology(res, "Must provide username", 403);
    if (!password) return apology(res, "Must provide password", 403);

    db.get("SELECT * FROM users WHERE family_name = ?", [familyName], (err, user) => {
        if (err || !user || !bcrypt.compareSync(password, user.hash)) {
            return apology(res, "Invalid family name and/or password", 403);
        }

        req.session.user_id = user.id;
        req.flash("Logging in succeeded");
        res.redirect("/");
    });
});

app.get('/login', (req, res) => {
    res.render("login.html");
});


app.use(express.urlencoded({ extended: true }));
app.use(flash());

// Configure session management
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: false
}));



// Logout route
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

// Register route
app.post('/register', (req, res) => {
    req.session.destroy(); // Clear any active session

    const { family_name, contact, password, confirmation } = req.body;

    if (!family_name) return apology(res, "Must provide a name");
    if (!contact) return apology(res, "Lack of information");
    if (!password) return apology(res, "Must provide password");
    if (!confirmation || confirmation !== password) return apology(res, "Passwords don't match");

    const hash = bcrypt.hashSync(password, 10);

    db.run(
        "INSERT INTO users (family_name, hash, contact) VALUES (?, ?, ?)",
        [family_name, hash, contact],
        function (err) {
            if (err) return apology(res, "Username already exists");

            req.session.user_id = this.lastID; // Store new user's ID in session
            req.flash("Registered!");
            res.redirect("/");
        }
    );
});

app.get('/register', (req, res) => {
    res.render("register.html");
});


app.use(express.urlencoded({ extended: true }));

// Configure session management
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: false
}));



// Search route
app.get('/search', loginRequired, (req, res) => {
    res.render("search.html");
});

// Profile route
app.get('/profile', loginRequired, (req, res) => {
    const userId = req.session.user_id;

    db.get("SELECT family_name, contact FROM users WHERE id = ?", [userId], (err, user) => {
        if (err || !user) return apology(res, "User not found");

        db.get("SELECT COUNT(name) as count FROM children WHERE family_id = ?", [userId], (err, children) => {
            if (err) return apology(res, "Database error");

            res.render("profile.html", {
                family_name: user.family_name,
                contact: user.contact,
                count: children.count
            });
        });
    });
});


app.use(express.urlencoded({ extended: true }));
app.use(flash());

// Configure session management
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: false
}));



// Password change route
app.post('/ch_pswrd', loginRequired, (req, res) => {
    const userId = req.session.user_id;

    const currentPassword = req.body.current;
    if (!currentPassword) return apology(res, "Write the current password");

    db.get("SELECT * FROM users WHERE id = ?", [userId], (err, user) => {
        if (err || !user || !bcrypt.compareSync(currentPassword, user.hash)) {
            return apology(res, "Invalid password", 403);
        }

        const newPassword = req.body.updated;
        const confirmPassword = req.body.confirm;

        if (!newPassword) return apology(res, "Empty place");
        if (!confirmPassword) return apology(res, "Empty place");
        if (newPassword !== confirmPassword) return apology(res, "Don't match");

        const hashedNewPassword = bcrypt.hashSync(newPassword, 10);
        db.run("UPDATE users SET hash = ? WHERE id = ?", [hashedNewPassword, userId], (err) => {
            if (err) return apology(res, "Database error");

            req.flash("PASSWORD HAS BEEN SUCCESSFULLY CHANGED!");
            res.redirect("/");
        });
    });
});

app.get('/ch_pswrd', loginRequired, (req, res) => {
    res.render("ch_pswrd.html");
});

app.listen(3000, () => {
    console.log("Server running on port 3000");
});
