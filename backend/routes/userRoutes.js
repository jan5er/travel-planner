const express = require('express')
const router = express.Router()
const { getMe, updateMe, changePassword } = require('../controllers/userController')
const auth = require('../middleware/auth')

router.use(auth)

router.get('/me', getMe)
router.patch('/me', updateMe)
router.post('/change-password', changePassword)

module.exports = router