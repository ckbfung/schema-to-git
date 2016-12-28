'use strict'

var moment = require('moment')
var fs = require('fs')
var git = require('git-controller')
var edge = require('edge')

function addGitRepo(gitRepo, files, config) {
    var subFiles = files
    if (files.length > 50) {
        subFiles = files.splice(0,50)
    }
    gitRepo.add(subFiles, function(err) {
        if (err) {
            throw err
        }
        if (subFiles != files) {
            addGitRepo(gitRepo, files, config)
        } else {
            var staged = gitRepo.statusSync().staged.length
            if (staged > 0) {
                var comment = moment(new Date()).format('YYYY-MM-DD hh:mm:ss')
                console.log(`${staged} files to commit: ${comment}.`)
                gitRepo.commitSync(comment)
            }
            gitRepo.push(config.gitRepo.remote, config.gitRepo.branch, function(err) {
                if (err) {
                    throw err
                }
            })
        }
    })
}

function queryObject(getQbject, destFolder, item, lastModifiedDate, callback) {
    getQbject(null, function(error, result) {
        if (error) {
            throw error
        }
        var files = []
        for(var Object of result) {
            var name = eval("`" + item.Object.Name + "`")
            var definition = eval("`" + item.Object.Definition + "`")
            
            var destFile = destFolder + '/' + name.replace(' ', '')
            fs.writeFileSync(destFile, definition, 'utf8')

            files.push(destFile)
        }
        callback(files)
    })
}

function queryObjects(getQbjects, item, gitRepo, config, lastModifiedDate) {
    var destFolder = config.schemaPath + '/' + item.ObjectName
    if (fs.existsSync(destFolder) == false) {
        fs.mkdirSync(destFolder)
    }
    getQbjects(null, function(error, result) {
        if (error) {
            throw error
        }

        var addFiles = []
        var left = result.length
        var completedCallback = function(destFile) {
            addFiles = addFiles.concat(destFile)

            --left
            if (left <= 0) {
                addGitRepo(gitRepo, addFiles, config)
            }
        }

        for(var Object of result) {
            var query = eval("`" + item.QueryObject + "`")
            console.log(query)
        
            queryObject(
                edge.func('sql',
                {
                    connectionString: config.connectionString,
                    source: query
                }),
                destFolder, item, lastModifiedDate, completedCallback)
        }
    })
}

function schemaSync(config, lastModifiedDate) {
    if (fs.existsSync(config.schemaPath) == false) {
        fs.mkdirSync(config.schemaPath)
    }

    var gitRepo = git(config.gitRepo.path)
    for (var item of config.schemaList) {
        var query = eval("`" + item.QueryObjects + "`")
        console.log(query)

        queryObjects(
            edge.func('sql',
            {
                connectionString: config.connectionString,
                source: query
            }),
            item, gitRepo, config, lastModifiedDate)
    }
}

module.exports = schemaSync