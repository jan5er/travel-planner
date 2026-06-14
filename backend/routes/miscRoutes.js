const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { addMisc, getMiscs, updateMisc, deleteMisc } = require('../controllers/miscController');

router.use(auth);

router.post('/:cityId', addMisc);
router.get('/:cityId', getMiscs);
router.patch('/:miscId', updateMisc);
router.delete('/:miscId', deleteMisc);

module.exports = router;