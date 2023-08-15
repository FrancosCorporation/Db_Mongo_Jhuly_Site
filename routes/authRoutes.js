const express = require('express')
const path = require('path')
const router = express.Router()

router.get('/', async (req, res) => {
    return res.status(200).json({home:'home'})
})


//router.get('/teste', async (req, res) => {
//    return res.status(200).sendFile((path.join(__dirname, '../pages/teste.html')))
//})
module.exports = app => app.use(router)