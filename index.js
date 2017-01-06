'use strict'

var moment = require('moment')
var fs = require('fs')
var fx = require('node-fs')
var git = require('git-controller')
var util = require('util')
var eventEmitter = require('events').EventEmitter
var dbConnection = require('./dbConnection')

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

function queryObjects(result, item, config, emitter, callback) {
    var addFiles = []
    var getObject = function(result) {
        if (result.length <= 0) {
            callback(null, addFiles)
        } else {
            var Object = result.shift()
            var Param = config.param
            var query = eval("`" + item.QueryObject + "`")
            emitter.emit('Message', query)

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

var getCallback = function(callback) {
    if (callback != null) {
        return callback
    }
    return function(err) {
        if (err) {
            throw err
        }
    }
}

function SchemaSync(schemaConfig, gitConfig) {
    if ((this instanceof SchemaSync) == false) {
        return new SchemaSync(schemaConfig, gitConfig)
    }

    this.SchemaConfig = schemaConfig
    this.GitConfig = gitConfig

    eventEmitter.call(this)
}
 
util.inherits(SchemaSync, eventEmitter)

SchemaSync.prototype.GetSchema = function getSchema(connectionString, param, callback) {
    callback = getCallback(callback)

    var self = this
    var config = JSON.parse(JSON.stringify(self.SchemaConfig))
    config.connectionString = connectionString
    config.param = JSON.parse(JSON.stringify(param))

    if (fs.existsSync(config.schemaPath) == false) {
        fx.mkdirSync(config.schemaPath, 777, true)
    }

    var addFiles = []
    var getObject = function(schemaList) {
        if (schemaList.length <= 0) {
            callback(null, addFiles)
        } else {
            var item = schemaList.shift()

            config.destFolder = config.schemaPath + '/' + item.ObjectName
            if (fx.existsSync(config.destFolder) == false) {
                fx.mkdirSync(config.destFolder, 777, true)
            }

            var Param = config.param
            var query = eval("`" + item.QueryObjects + "`")
            self.emit('Message', query)

            var conn = dbConnection(config.DB, config.connectionString)
            conn.execute(query, function(error, result) {
                if (error) {
                    callback(error)
                } else {
                    queryObjects(result, item, config, self,
                        function(err, destFiles) {
                            if (err) {
                                callback(err)
                            } else {
                                addFiles = addFiles.concat(destFiles)
                                getObject(schemaList)
                            }
                        })
                }
            })
        }
    }
    getObject(config.schemaList)
}

SchemaSync.prototype.GitPush = function gitPush(schemaFiles, callback) {
    callback = getCallback(callback)

    var self = this
    var gitRepo = git(self.GitConfig.Path)

    var commitGitRepo = function() {
        var staged = gitRepo.statusSync().staged.length
        if (staged > 0) {
            var comment = moment(new Date()).format('YYYY-MM-DD hh:mm:ss')
            self.emitter.emit('Message', `${staged} files to commit: ${comment}.`)
            gitRepo.commitSync(comment)
        }
        if (self.GitConfig.Remote != null && self.GitConfig.Branch != null &&
            self.GitConfig.Remote.length > 0 && self.GitConfig.Branch.length > 0) {
            gitRepo.push(self.GitConfig.Remote, self.GitConfig.Branch, function(err) {
                callback(err)
            })
        } else {
            callback(null)
        }
    }

    var addGitRepo = function(files) {
        var subFiles = files
        if (files.length > 50) {
            subFiles = files.splice(0,50)
        }
        gitRepo.add(subFiles, function(err) {
            if (err) {
                callback(err)
            } else {
                if (subFiles != files) {
                    addGitRepo(files)
                } else {
                    commitGitRepo()
                }
            }
        })
    }
}

module.exports = SchemaSync