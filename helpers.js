const express = require('express');
const session = require('express-session');
const axios = require('axios');

const app = express();
app.use(express.urlencoded({ extended: true }));

// Configure session management
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: false
}));

// Apology function to render messages
function apology(res, message, code = 400) {
    const escapeChars = {
        "-": "--",
        " ": "-",
        "_": "__",
        "?": "~q",
        "%": "~p",
        "#": "~h",
        "/": "~s",
        '"': "''"
    };

    for (const [oldChar, newChar] of Object.entries(escapeChars)) {
        message = message.replaceAll(oldChar, newChar);
    }

    res.status(code).render("apology.html", { top: code, bottom: message });
}

// Login required middleware
function loginRequired(req, res, next) {
    if (!req.session.user_id) {
        return res.redirect("/login");
    }
    next();
}

// Lookup stock quote
async function lookup(symbol) {
    const url = `https://finance.cs50.io/quote?symbol=${symbol.toUpperCase()}`;

    try {
        const response = await axios.get(url);
        return {
            name: response.data.companyName,
            price: response.data.latestPrice,
            symbol: symbol.toUpperCase()
        };
    } catch (error) {
        console.error("Request error:", error);
        return null;
    }
}

// Example usage
app.get('/profile', loginRequired, (req, res) => {
    res.send("User profile page");
});

app.listen(3000, () => {
    console.log("Server running on port 3000");
});