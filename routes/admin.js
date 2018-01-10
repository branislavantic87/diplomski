var express = require('express');
var router = express.Router();
var m = require('../middlewares/middleware');
var Course = require('../models/course');
var User = require('../models/user');

router.get('/', (req, res) => {
    res.render('admin/index');
})

router.get('/courses', (req, res) => {
    Course.find({}).populate('teacher').exec((err, allCourses) => {
        res.render('admin/courses', { allCourses: allCourses });
    });
});

router.get('/courses/:id/edit', (req, res) => {
    User.find({ type: 'teacher' }, (err, foundTeachers) => {
        Course.findById(req.params.id).populate('teacher').exec((err, foundCourse) => {
            res.render('admin/courseEdit', { course: foundCourse, allTeachers: foundTeachers });
        })
    })
})

router.put('/courses/:id', (req, res) => {
    console.log('================');
    var newData = {
        name: req.body.name,
        code: req.body.code,
        description: req.body.description,
        teacher: req.body.teacher
    };
    req.body.image === "" ? newData.$unset = { image: "" } : newData.image = req.body.image;
    Course.findById(req.params.id, (err, updated) => {
        if (err) {
            req.flash('error', err.message);
            res.redirect('/courses');
        } else {
            console.log(req.body);
            // ako je promenjen teacher
            if (req.body.teacher != updated.teacher) {
                // obrisi iz starog teachera
                User.findById(updated.teacher, (err, foundTeacher) => {
                    foundTeacher.courses.pull(updated._id);
                    foundTeacher.save();
                });
                // dodaj kurs novom teacheru
                User.findById(req.body.teacher, (err, foundTeacher) => {
                    foundTeacher.courses.addToSet(updated._id);
                    foundTeacher.save();
                });

            }
            updated.set(newData);
            updated.save((e, a) => {
                console.log(a);
            });

            req.flash('success', 'Successfully Updated!');
            res.redirect('/admin/courses/');

        }
    })
})

router.get('/users', (req, res) => {
    User.find({}, (err, allUsers) => {
        res.render('admin/users', { allUsers: allUsers });
    })
});

router.get('/users/:id/edit', (req, res) => {
    var enumm = User.schema.path('type').enumValues;
    Course.find({}, 'name', (err, allCourses) => {
        User.findById(req.params.id).populate('courses', 'name').exec((err, foundUser) => {
            if (err || !foundUser) {
                req.flash('error', 'That user can not be found!');
                res.redirect('/admin/users');
            } else {
                var fCourses = allCourses.filter(el => foundUser.courses.findIndex(a => a.id == el.id) < 0);
                res.render('admin/userEdit', { user: foundUser, enumm: enumm, allCourses: fCourses });
            }
        })
    })
});

router.put('/users/:id', (req, res) => {
    var updatedUser = {

        firstName: req.body.firstName,
        lastName: req.body.lastName,
        image: req.body.image,
        email: req.body.email,
        type: req.body.type,
        username: req.body.username

    }
    if (!req.body.courses) req.body.courses = [];

    User.findById(req.params.id, (err, foundUser) => {
        if (err || !foundUser) {
            req.flash('error', 'Can not find that user!');
            res.redirect('/admin/users');
        } else {

            var stringIds = foundUser.courses.map(e => e.toString());
            if (!m.isEqualArrays(foundUser.courses, req.body.courses)) {
                var newCourses = m.diffInArrays(req.body.courses, stringIds);
                var deletedCourses = m.diffInArrays(stringIds, req.body.courses);

                if (newCourses.length > 0) {
                    console.log('za dodavanje: ' + newCourses);
                    Course.find({ _id: { $in: newCourses } }, 'students', (err, allCourses) => {
                        allCourses.forEach(c => {
                            c.students.push({ data: foundUser._id });
                            c.save();
                        })
                    })
                }
                if (deletedCourses.length > 0) {
                    console.log('za brisanje: ' + deletedCourses);
                    Course.find({ _id: { $in: deletedCourses } }, 'students', (err, allCourses) => {
                        allCourses.forEach(c => {
                            var i = c.students.findIndex(e => e.data == foundUser.id);
                            c.students.splice(i, 1);
                            c.save();
                        })
                    })
                }
            }
            foundUser.set(updatedUser);
            foundUser.courses = req.body.courses;
            foundUser.save();

            //req.flash('success', 'Updated!');
            res.redirect('/admin/users');
        }
    })

});

router.delete('/users/:id', (req, res) => {
    User.findById(req.params.id, (err, deleted) => {
        if (deleted._id != '5a54d6e9619944545c9e166d')
            deleted.remove();
        res.redirect('/admin/users');
    });
})


module.exports = router;