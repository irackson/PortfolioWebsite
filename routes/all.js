//! create our new router
const router = require('express').Router();
const { renderIndex } = require('../controllers/all');

///////////////////////////////
//! Router Specific Middleware
////////////////////////////////

////////////////////////////////
//! Router Specific Routes
////////////////////////////////

//* RENDER ALL
router.get('/', renderIndex);

////////////////////////////////
//! Export the Router
////////////////////////////////

module.exports = router;
