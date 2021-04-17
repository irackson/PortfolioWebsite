require('dotenv').config();
const bcrypt = require('bcryptjs');
const saltRounds = parseInt(process.env.SALT_ROUNDS) || 10;
const adminCode = process.env.ADMIN_CODE || '';

const { sendWelcome, doUnsubscribe } = require('../utils/sub');

////////////////////////
//! Import Models
////////////////////////
const User = require('../models/User');
const Sub = require('../models/Sub');

///////////////////////////
//! Controller Functions
///////////////////////////

const getCreate = async (req, res) => {
    req.session.user = undefined;
    res.render('users/create');
};

async function usernameFree(attempt) {
    const users = await User.find({ username: attempt });
    if (users.length === 0) {
        return true;
    } else {
        return false;
    }
}

const createSubmit = async (req, res) => {
    if (await usernameFree(req.body.username)) {
        if (req.body.admin === 'on') {
            if (req.body.admin_code.toLowerCase() === adminCode.toLowerCase()) {
                req.body.admin = true;
            } else {
                res.json({
                    message:
                        'You have entered the wrong Admin Code. Account creation failed. Contact your web developer or call your employer for the right code, and then hit the back button and try again.',
                });
                return;
            }
        } else {
            req.body.admin = false;
        }

        const salt = await bcrypt.genSalt(saltRounds);
        req.body.password = await bcrypt.hash(req.body.password, salt);
        const user = await User.create(req.body);
        res.redirect('/users/login');
    } else {
        res.json({
            message:
                'An account already exists with this username. Account creation failed. Use the back button to create an account with a different username.',
        });
    }
};

const getLogin = async (req, res) => {
    res.render('users/login');
};

const loginSubmit = async (req, res) => {
    try {
        const user = await User.findOne({ username: req.body.username });
        if (user) {
            const result = await bcrypt.compare(
                req.body.password,
                user.password
            );
            if (result) {
                req.session.user = user.username;
                req.session.admin = user.admin;
                res.redirect('/');
            } else {
                res.status(400).json({ error: 'Password is wrong' });
            }
        } else {
            res.status(400).json({ error: 'No User by That Name' });
        }
    } catch (error) {
        res.json(error);
    }
};

const subscriptionSubmit = async (req, res) => {
    const subs = await Sub.find({}).populate({
        path: 'contentType',
    });

    if (req.body.projects === 'on' && req.body.blog === 'on') {
        for (let i = 0; i < subs.length; i++) {
            subs[i].subscribers.push({
                first_name:
                    req.body.first_name === ''
                        ? 'Stranger'
                        : req.body.first_name,
                email: req.body.email,
                confirmation: true,
            });
            await subs[i].save();
        }
        await sendWelcome('projects', req.body.first_name, req.body.email);
        await sendWelcome('blog', req.body.first_name, req.body.email);

        req.session.sub = {
            projects: true,
            blog: true,
        };
    } else if (req.body.projects === 'on') {
        const projectSub = subs.filter(
            (e) => e.contentType.dir === 'projects'
        )[0];
        projectSub.subscribers.push({
            first_name:
                req.body.first_name === '' ? 'Stranger' : req.body.first_name,
            email: req.body.email,
            confirmation: true,
        });
        await projectSub.save();
        await sendWelcome('projects', req.body.first_name, req.body.email);

        req.session.sub = {
            projects: true,
        };
    } else if (req.body.blog === 'on') {
        const blogSub = subs.filter((e) => e.contentType.dir === 'blog')[0];
        blogSub.subscribers.push({
            first_name:
                req.body.first_name === '' ? 'Stranger' : req.body.first_name,
            email: req.body.email,
            confirmation: true,
        });
        await blogSub.save();
        await sendWelcome('blog', req.body.first_name, req.body.email);

        req.session.sub = {
            blog: true,
        };
    }

    console.log(req.session);
    try {
        res.redirect('back');
    } catch (error) {
        console.log('error');
    }
};

const unsubscribeRender = async (req, res) => {
    const params = req._parsedOriginalUrl._raw.split('/').pop().split('&');

    const email = params[0].split('=').pop();
    const contentType = params[1].split('=').pop();

    res.render('users/unsubscribe', {
        email,
        contentType,
    });
};

const unsubscribeSubmit = async (req, res) => {
    const params = req.params[0].split('&');

    const email = params[0].split('=').pop();
    const contentType = params[1].split('=').pop();

    let successfullyRemoved = false;
    try {
        successfullyRemoved = await doUnsubscribe(contentType, email);
    } catch (error) {
        res.json({
            failure:
                'Something went wrong when attempting to remove this email from the specified mailing list',
            error: error,
        });
    }
    if (successfullyRemoved) {
        res.json({ success: 'You have been removed from the mailing list.' });
    }
};

const logout = (req, res) => {
    req.session.user = undefined;
    req.session.admin = false;
    req.session.sub = undefined;
    res.redirect('/');
};

//////////////////////////////
//! Export Controller
//////////////////////////////
module.exports = {
    getCreate,
    createSubmit,
    getLogin,
    loginSubmit,
    logout,
    subscriptionSubmit,
    unsubscribeRender,
    unsubscribeSubmit,
};
