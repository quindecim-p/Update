import ApplicationModel from '../models/application.js'
import UserModel from '../models/user.js'

export const sendingApplication = async (req, res) => {
    try {

        const doc = new ApplicationModel({
            credit: req.body.credit,
            period: req.body.period,
            salary: req.body.salary,
            expenses: req.body.expenses,
            purpose : req.body.purpose,
            percent : req.body.percent,
            payment : req.body.payment,
            startDate : req.body.startDate,
            endDate : req.body.endDate,
            status : 2,
            user: req.userId,
        })

        const application = await doc.save()

        res.json(application)
    } catch (err) {
        console.log(err)
        res.status(500).json({
            message: 'Не удалось отправить заявку'
        })
    }
}

export const getMyApplications = async (req, res) => {
    try {
        const userId = req.userId

        const applications = await ApplicationModel.find({ user: userId }).populate('user')

        res.json(applications)
    } catch (err) {
        console.log(err)
        res.status(500).json({
            message: 'Не удалось получить заявки'
        })
    }
}

export const deleteMyApplication = async (req, res) => {
    try {
        const userId = req.userId

        const activeApplication = await ApplicationModel.findOneAndDelete({ user: userId, status: 2 }, { sort: { createdAt: -1 } })

        if (activeApplication) {
            res.status(200).json({ message: 'Активная заявка успешно удалена' })
        } else {
            res.status(404).json({ message: 'Активная заявка не найдена' })
        }
    } catch (err) {
        console.error(err)
        res.status(500).json({ message: 'Не удалось удалить активную заявку' })
    }
}

export const getAllApplications = async (req, res) => {
    try {
        const applications = await ApplicationModel.find().populate('user')
        res.json(applications)
    } catch (err) {
        console.log(err)
        res.status(500).json({
            message: 'Не удалось получить заявки'
        })
    }
}

export const updateStatus = async (req, res) => {
    try {
        const { applicationPassport, newStatus } = req.body

        const existingUser = await UserModel.findOne({ passport: applicationPassport })

        if (existingUser) {

            let applications = await ApplicationModel.find({ user: existingUser._id, status: 2 })

            for (let application of applications) {
                application.status = newStatus
                await application.save()
            }

            res.json({ message: 'Статус успешно обновлен' })
        } else {
            res.status(404).json({ message: 'Пользователь не найден' });
        }
    } catch (err) {
        console.log(err)
        res.status(500).json({
            message: 'Не удалось обновить статус'
        })
    }
}