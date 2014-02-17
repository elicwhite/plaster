define(["dataBacking/baseBacking"], function(BaseBacking) {
  var WebSQLBacking = BaseBacking.extend({
    _db: null,

    init: function() {
      this._error = this._error.bind(this);
      this._db = openDatabase("draw", "1.0", "draw", 2 * 1024 * 1024, this._databaseCreated.bind(this));
    },

    getFiles: function(callback) {
      this._db.readTransaction((function(tx) {
        tx.executeSql('SELECT * FROM `files` ORDER BY modifiedTime DESC', [], (function(transaction, results) {
          var resultsObj = this._convertResultToObject(results);
          callback(resultsObj);
        }).bind(this));
      }).bind(this));
    },

    getFile: function(fileId, callback) {
      this._db.readTransaction((function(tx) {
        tx.executeSql('SELECT * FROM `files` WHERE `id` = ?', [fileId], (function(transaction, results) {
          var resultsObj = this._convertResultToObject(results);
          callback(resultsObj[0]);
        }).bind(this));
      }).bind(this));
    },

    getFileActions: function(fileId, callback) {
      this._db.readTransaction((function(tx) {
        tx.executeSql('SELECT * FROM `'+fileId+'`', [], (function(transaction, results) {
          var resultsObj = this._convertResultToObject(results, ["value"]);
          callback(resultsObj);
        }).bind(this));
      }).bind(this));
    },

    createFile: function(callback) {
      var fileId = this._getGuid();

      this._db.transaction(function(tx) {

        // You can't seem to use prepared statement variables as the table name
        tx.executeSql('CREATE TABLE IF NOT EXISTS `' + fileId + '` ' +
          '(id INTEGER PRIMARY KEY, type VARCHAR(255), value TEXT)', []);

        var file = {
          id: fileId,
          name: "Untitled File",
          modifiedTime: Date.now()
        }

        tx.executeSql('INSERT INTO `files` VALUES (?, ?, ?)', [file.id, file.name, file.modifiedTime], this._success, this._error);

        callback(file);
      });
    },

    renameFile: function(fileId, newFileName) {
      this._db.transaction(function(tx) {
        tx.executeSql('UPDATE `files` SET name = ? WHERE id = ?', [newFileName, fileId], this._success, this._error);
      });
    },

    deleteFile: function(fileId) {
      this._db.transaction(function(tx) {
        tx.executeSql('DELETE FROM `files` WHERE id = ?', [fileId], this._success, this._error);

        tx.executeSql('DROP TABLE `'+fileId+'`', [], this._success, this._error);
      });
    },

    addAction: function(fileId, action) {
      this._db.transaction(function(tx) {
        tx.executeSql('INSERT INTO `'+fileId+'` (id, type, value) VALUES (?, ?, ?)', [action.id, action.type, JSON.stringify(action.value)], this._success, this._error);
      });
    },

    removeAction: function(fileId, actionIndex) {
      this._db.transaction(function(tx) {
        tx.executeSql('DELETE FROM `'+fileId+'` WHERE id = ?', [actionIndex], this._success, this._error);
      });
    },

    updateFileModified: function(fileId, timestamp) {
      this._db.transaction(function(tx) {
        tx.executeSql('UPDATE `files` SET modifiedTime = ? WHERE id = ?', [timestamp, fileId], this._success, this._error);
      });
    },

    clearAll: function() {
      this.getFiles((function(files) {
        for (var i = 0; i < files.length; i++) {
          this.deleteFile(files[i].id);
        }
      }).bind(this));
    },

    // The database was created, set up the tables
    _databaseCreated: function(db) {
      this._db.transaction(function(tx) {
        tx.executeSql('CREATE TABLE IF NOT EXISTS files ' +
          '(id VARCHAR(255) PRIMARY KEY, name VARCHAR(255), modifiedTime INTEGER)');
      });
    },

    // JSON Decode should be an array of columns that have JSON that should be parsed
    _convertResultToObject: function(results, JSONDecode) {
      var rows = results.rows;
      var objArray = new Array(rows.length);

      for (var i = 0; i < rows.length; i++) {
        var item = rows.item(i);

        var newObj = {};
        objArray[i] = newObj;

        for (var prop in item) {
          newObj[prop] = item[prop];
        }

        if (JSONDecode) {
          for (var j = 0; j < JSONDecode.length; j++) {
            // If this key exists on the object
            var value = objArray[i][JSONDecode[j]];
            if (value) {
              // Replace it with a JSON Parsed version
              var obj = JSON.parse(value);
              objArray[i][JSONDecode[j]] = obj;
            }
          }
        }

      }

      return objArray;
    },

    _success: function(e) {

    },

    _error: function(e) {
      console.error("Error with WebSQL", e);
    }


  });

  return WebSQLBacking;
});