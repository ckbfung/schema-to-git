# Schema to Git

## Installation

```
$ npm install schema-to-git
```

## Usage

```js
var SchemaSync = require('schema-to-git')

var schemaConfig = {
    DB: 'MS SQL',
    schemaPath: '../Schema',
    schemaList: [
        {
            ObjectName: 'Sproc',
            QueryObjects: "SELECT top 5 name as Name " +
                "FROM sys.procedures WHERE modify_date > CONVERT(VARCHAR(10), '${Param.LastModifiedDate}', 101) " +
                "ORDER BY modify_date desc",
            QueryObject: "SELECT '${Object.Name}' as Name, definition as Definition " +
                "FROM sys.sql_modules WHERE object_id = (OBJECT_ID(N'DbName.dbo.${Object.Name}'))",
            Object: {
                Name: "${Object.Name}.sql",
                Definition: "${Object.Definition}'))"
            }
        }
    ]
}

var gitConfig = {
    Path: './',
    Remote: 'origin',
    Branch: 'develop'
}

var schemaSyn = SchemaSync(schemaConfig, gitConfig)
schemaSyn.on('Message', function(msg) {
    logger.info(msg)
})

var connectionString: "Data Source=Hostname\\DbInstance;Initial Catalog=DbName;Integrated Security=True"
schemaSyn.GetSchema(
    connectionString,
    { LastModifiedDate: '10/01/1997' },
    function(err, addedFiles) {
        schemaSyn.GitPush(addedFiles, function(err) {
            if (err) {
                logger.error(err)
            }
        })
    })
```