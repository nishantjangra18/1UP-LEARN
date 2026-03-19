const app = require('./app');

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`1up Learn server running on port ${PORT}`));
