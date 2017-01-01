# Schema to Git

## Installation

```
$ npm install schema-to-git
```

## Usage

```js
var SchemaSync = require('schema-to-git')

var config = {
    DB: 'MS SQL',
    schemaPath: '../Schema',
    gitRepo : {
        path: './',
        remote: 'origin',
        branch: 'develop'
    },
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

var connectionString: "Data Source=Hostname\\DbInstance;Initial Catalog=DbName;Integrated Security=True"
var schemaSyn = SchemaSync(
    connectionString, config, { LastModifiedDate: '10/01/1997' },
    function(err) {
        if (err) {
            console.log(err)
        }
    })
schemaSyn.on('Message', function(msg) {
    console.log(msg)
})    
```