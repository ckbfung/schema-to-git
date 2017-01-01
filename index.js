'use strict'

var moment = require('moment')
var fs = require('fs')
var fx = require('node-fs')
var git = require('git-controller')
var eventEmitter = require('events').EventEmitter;
var dbConnection = require('./dbConnection')

function addGitRepo(files, config, callback) {
    var gitRepo = config.gitRepo
    var subFiles = files
    if (files.length > 50) {
        subFiles = files.splice(0,50)
    }
    gitRepo.add(subFiles, function(err) {
        if (err) {
            callback(err)
        } else {
            if (subFiles != files) {
                addGitRepo(files, config, callback)
            } else {
                var staged = gitRepo.statusSync().staged.length
                if (staged > 0) {
                    var comment = moment(new Date()).format('YYYY-MM-DD hh:mm:ss')
                    config.emitter.emit('Message', `${staged} files to commit: ${comment}.`)
                    gitRepo.commitSync(comment)
                }
                if (config.git.remote != null && config.git.branch != null &&
                    config.git.remote.length > 0 && config.git.length > 0) {
                    gitRepo.push(config.git.remote, config.git.branch, function(err) {
                        callback(err)
                    })
                } else {
                    callback(null)
                }
            }
        }
    })
}

function queryObject(result, config, item, callback) {
    var destFolder = config.destFolder
    var Param = config.param
    var files = []

    var getObject = function(result) {
        if (result.length <= 0) {
            callback(null, files)
        } else {
            var Object = result.shift()
            var Param = config.param

            var name = eval("`" + item.Object.Name + "`")
            var definition = eval("`" + item.Object.Definition + "`")

            var destFile = destFolder + '/' + name.replace(' ', '')
            fs.writeFileSync(destFile, definition, 'utf8')

            files.push(destFile)
            getObject(result)
        }
    }
    getObject(result)
}

function queryObjects(result, item, config, callback) {
    var addFiles = []
    var getObject = function(result) {
        if (result.length <= 0) {
            addGitRepo(addFiles, config, callback)
        } else {
            var Object = result.shift()
            var Param = config.param
            var query = eval("`" + item.QueryObject + "`")
            config.emitter.emit('Message', query)

            var conn = dbConnection(config.DB, config.connectionString)
            conn.execute(query, function(error, objects) {
                if (error) {
                    callback(error)
                } else {
                    queryObject(
                        objects, config, item,
                        function(error, destFile) {
                            if (error) {
                                callback(error)
                            } else {
                                addFiles = addFiles.concat(destFile)
                                getObject(result)
                            }
                        })
                }
            })
        }
    }
    getObject(result)
}

function schemaSync(connectionString, syncConfig, param, callback) {
    if (callback == null) {
        callback = function(err) {
            if (err) {
                throw err
            }
        }
    }

    var config = JSON.parse(JSON.stringify(syncConfig))
    config.connectionString = connectionString
    config.param = JSON.parse(JSON.stringify(param))
    config.emitter = new eventEmitter()
    config.gitRepo = git(config.git.path)

    if (fs.existsSync(config.schemaPath) == false) {
        fx.mkdirSync(config.schemaPath, 777, true)
    }

    var getObject = function(schemaList) {
        if (schemaList.length <= 0) {
            callback(null)
        } else {
            var item = schemaList.shift()

            config.destFolder = config.schemaPath + '/' + item.ObjectName
            if (fx.existsSync(config.destFolder) == false) {
                fx.mkdirSync(config.destFolder, 777, true)
            }

            var Param = config.param
            var query = eval("`" + item.QueryObjects + "`")
            config.emitter.emit('Message', query)

            var conn = dbConnection(config.DB, config.connectionString)
            conn.execute(query, function(error, result) {
                if (error) {
                    callback(error)
                } else {
                    queryObjects(result,  item, config,
                        function(err) {
                            if (err) {
                                callback(err)
                            } else {
                                getObject(schemaList)
                            }
                        })
                }
            })
        }
    }
    getObject(config.schemaList)
    return config.emitter
}

module.exports = schemaSync