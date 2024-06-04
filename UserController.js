import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'

import UserModel from '../models/user.js'
import LogModel from '../models/log.js'

export const register = async (req, res) => {
    try {
        const phoneExists = await UserModel.exists({ number: req.body.number })
        if (phoneExists) {
            return res.status(409).json({
                message: 'Номер телефона уже зарегистрирован'
            })
        }

        const passportExists = await UserModel.exists({ passport: req.body.passport })
        if (passportExists) {
            return res.status(409).json({
                message: 'Паспорт уже зарегистрирован'
            })
        }

        const emailExists = await UserModel.exists({ email: req.body.email })
        if (emailExists) {
            return res.status(409).json({
                message: 'Email уже зарегистрирован'
            })
        }

        const password = req.body.password
        const salt = await bcrypt.genSalt(10)
        const hash = await bcrypt.hash(password, salt)

        const doc = new UserModel({
            name: req.body.name,
            surname: req.body.surname,
            number: req.body.number,
            passport: req.body.passport,
            email: req.body.email,
            passwordHash : hash
        })

        const user = await doc.save()

        const token = jwt.sign(
            {
            _id: user._id
            },
            'secretkey',
            {
                expiresIn: '30d'
            }
        )

        const {passwordHash, ...userData} = user._doc

        res.json({
            ...userData,
            token
        })
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: 'Произошла ошибка на сервере. Пожалуйста, попробуйте еще раз.'
        })
    }
}

export const login = async (req, res) => {
    try {
        const user = await UserModel.findOne({ email: req.body.email })

        if (!user) {
            return res.status(404).json({
                message: 'Неверный логин или пароль'
            })
        }

        const isValidPass = await bcrypt.compare(req.body.password, user._doc.passwordHash)

        if (!isValidPass) {
            return res.status(400).json({
                message: 'Неверный логин или пароль'
            })
        }

        if (user.isBanned) {
            return res.status(400).json({
                message: 'Ваша учётная запись заблокирована'
            })
        }

        const token = jwt.sign(
            {
            _id: user._id
            },
            'secretkey',
            {
                expiresIn: '30d'
            }
        )

        const {passwordHash, ...userData} = user._doc

        res.json({
            ...userData,
            token
        })
    } catch (err) {
        console.log(err)
        res.status(500).json({
            message: 'Не удалось авторизоваться'
        })
    }
}

export const getMe = async (req, res) => {
    try {
        const user = await UserModel.findById(req.userId)

        if (!user) {
            return res.status(404).json({
                message: 'Пользователь не найден'
            })
        }

        const {passwordHash, ...userData} = user._doc

        res.json(userData)
    } catch (err) {
        console.log(err)
        res.status(500).json({
            message: 'Не удалось получить информацию'
        })
    }
}

export const updateUser = async (req, res) => {
    try {
        const { name, surname, number, passport, email } = req.body

        const existingUser = await UserModel.findById(req.userId)
        if (!existingUser) {
            return res.status(404).json({
                message: 'Пользователь не найден'
            })
        }

        if (number !== existingUser.number) {
            const phoneExists = await UserModel.exists({ number })
            if (phoneExists) {
                return res.status(409).json({
                    message: 'Номер телефона уже зарегистрирован'
                })
            }
        }

        if (passport !== existingUser.passport) {
            const passportExists = await UserModel.exists({ passport })
            if (passportExists) {
                return res.status(409).json({
                    message: 'Паспорт уже зарегистрирован'
                })
            }
        }

        if (email !== existingUser.email) {
            const emailExists = await UserModel.exists({ email })
            if (emailExists) {
                return res.status(409).json({
                    message: 'Email уже зарегистрирован'
                })
            }
        }

        existingUser.name = name
        existingUser.surname = surname
        existingUser.passport = passport
        existingUser.email = email

        const updatedUser = await existingUser.save()

        const { passwordHash, ...userData } = updatedUser._doc
        res.json(userData)
    } catch (error) {
        console.error(error)
        res.status(500).json({
            message: 'Произошла ошибка на сервере. Пожалуйста, попробуйте еще раз.'
        })
    }
}

export const updatePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body

        const existingUser = await UserModel.findById(req.userId)
        if (!existingUser) {
            return res.status(404).json({
                message: 'Пользователь не найден'
            })
        }

        const isValidPass = await bcrypt.compare(oldPassword, existingUser._doc.passwordHash)

        if (!isValidPass) {
            return res.status(400).json({
                message: 'Неверный пароль'
            })
        }

        const password = newPassword
        const salt = await bcrypt.genSalt(10)
        const hash = await bcrypt.hash(password, salt)

        existingUser.passwordHash = hash

        const updatedUser = await existingUser.save()

        const { passwordHash, ...userData } = updatedUser._doc
        res.json(userData)
    } catch (error) {
        console.error(error)
        res.status(500).json({
            message: 'Произошла ошибка на сервере. Пожалуйста, попробуйте еще раз.'
        })
    }
}

export const getAllAccounts = async (req, res) => {
    try {
        const accounts = await UserModel.find()
        res.json(accounts)
    } catch (err) {
        console.log(err)
        res.status(500).json({
            message: 'Не удалось получить аккаунты'
        })
    }
}

export const ban = async (req, res) => {
    try {
        const { userPassport } = req.body

        const existingUser = await UserModel.findOne({ passport: userPassport })

        if (existingUser) {
            existingUser.isBanned = !existingUser.isBanned
            await existingUser.save()

            res.json({ existingUser })
        } else {
            res.status(404).json({
                message: 'Пользователь не найден'
            })
        }
    } catch (err) {
        console.error(err)
        res.status(500).json({
            message: 'Не удалось обновить статус пользователя'
        })
    }
}

export const createAdmin = async (req, res) => {
    try {
        const phoneExists = await UserModel.exists({ number: req.body.number })
        if (phoneExists) {
            return res.status(409).json({
                message: 'Номер телефона уже зарегистрирован'
            })
        }

        const passportExists = await UserModel.exists({ passport: req.body.passport })
        if (passportExists) {
            return res.status(409).json({
                message: 'Паспорт уже зарегистрирован'
            })
        }

        const emailExists = await UserModel.exists({ email: req.body.email })
        if (emailExists) {
            return res.status(409).json({
                message: 'Email уже зарегистрирован'
            })
        }

        const password = req.body.password
        const salt = await bcrypt.genSalt(10)
        const hash = await bcrypt.hash(password, salt)

        const doc = new UserModel({
            name: req.body.name,
            surname: req.body.surname,
            number: req.body.number,
            passport: req.body.passport,
            email: req.body.email,
            role: true,
            passwordHash : hash
        })

        const user = await doc.save()

        const token = jwt.sign(
            {
            _id: user._id
            },
            'secretkey',
            {
                expiresIn: '30d'
            }
        )

        const {passwordHash, ...userData} = user._doc

        res.json({
            ...userData,
            token
        })
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: 'Произошла ошибка на сервере. Пожалуйста, попробуйте еще раз.'
        })
    }
}

export const createLog = async (req, res) => {
    try {
        const { type } = req.body
        
        let boolType = true
        if (type === 'logout') {
            boolType = false
        }

        const doc = new LogModel({
            type: boolType,
            user: req.userId
        })

        const log = await doc.save()

        res.json({ log })
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: 'Произошла ошибка на сервере. Пожалуйста, попробуйте еще раз.'
        })
    }
}

export const getAllLogs = async (req, res) => {
    try {
        const logs = await LogModel.find().populate('user')
        res.json(logs)
    } catch (err) {
        console.log(err)
        res.status(500).json({
            message: 'Не удалось получить аккаунты'
        })
    }
}