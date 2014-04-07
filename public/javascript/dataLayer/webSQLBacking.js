define(["class", "helpers", "event"], function(Class, Helpers, Event) {
  var instance = Class.extend({
    _parent: null,

    _fileId: null,

    init: function(parent) {
      this._parent = parent;
    },

    load: function(fileId) {
      this._fileId = fileId;

      return this._parent.getFileInfo(fileId);
    },

    create: function(file) {
      return this._parent._addFile(file)
        .then((function() {
          return this.load(file.id);
        }).bind(this));
    },

    getActions: function() {
      return this._parent.readyPromise.then((function(server) {
        return new Promise((function(overallResolve, overallReject) {

          server.readTransaction((function(tx) {
            var promises = [];

            promises.push(new Promise((function(resolve, reject) {
              tx.executeSql('SELECT * FROM `F' + this._fileId + '-local`', [], (function(transaction, results) {
                  var resultsObj = this._parent._convertResultToObject(results, ["value"]);
                  resolve(resultsObj);
                }).bind(this),
                function(transaction, error) {
                  reject(error);
                });
            }).bind(this)));

            promises.push(new Promise((function(resolve, reject) {
              tx.executeSql('SELECT * FROM `F' + this._fileId + '-remote` ORDER BY `index`', [], (function(transaction, results) {
                  var resultsObj = this._parent._convertResultToObject(results, ["value"]);
                  resolve(resultsObj);
                }).bind(this),
                function(transaction, error) {
                  reject(error);
                });
            }).bind(this)));

            Promise.all(promises).then(function(results) {
              overallResolve({
                local: results[0],
                remote: results[1],
              });
            })
              .
            catch (function(error) {
              overallReject(error);
            });

          }).bind(this));

        }).bind(this));
      }).bind(this));
    },

    rename: function(newName) {
      return this._parent._renameFile(this._fileId, newName);
    },

    updateThumbnail: function(dataURL) {
      return this._parent._updateThumbnail(this._fileId, dataURL);
    },

    addLocalAction: function(action) {
      return this._parent.readyPromise.then((function(server) {
        return new Promise((function(resolve, reject) {
          server.transaction((function(tx) {
            tx.executeSql('INSERT INTO `F' + this._fileId + '-local` (id, type, value) VALUES (?, ?, ?)', [action.id, action.type, JSON.stringify(action.value)], (function(transaction, results) {
                var resultsObj = this._parent._convertResultToObject(results, ["value"]);
                resolve(resultsObj[0]);
              }).bind(this),
              function(transaction, error) {
                reject(error);
              });
          }).bind(this));
        }).bind(this));
      }).bind(this));
    },

    removeLocalAction: function(actionId) {
      return this._parent.readyPromise.then((function(server) {
        return new Promise((function(resolve, reject) {
          server.transaction((function(tx) {
            tx.executeSql('DELETE FROM `F' + this._fileId + '-local` WHERE id = ?', [actionId], (function(transaction, results) {
                var resultsObj = this._parent._convertResultToObject(results, ["value"]);
                resolve(resultsObj[0]);
              }).bind(this),
              function(transaction, error) {
                reject(error);
              });
          }).bind(this));
        }).bind(this));
      }).bind(this));
    },

    addRemoteActions: function(index, actions) {
      return this._parent.readyPromise.then((function(server) {
        return new Promise((function(resolve, reject) {
          server.transaction((function(tx) {
            tx.executeSql('UPDATE `F' + this._fileId + '-remote` SET `index` = `index` + ? WHERE `index` >= ?', [actions.length, index], (function(transaction, results) {
                var promises = [];

                actions.forEach((function(action) {
                  promises.push(new Promise((function(resolve, reject) {
                    tx.executeSql('INSERT INTO `F' + this._fileId + '-remote` (id, `index`, type, value) VALUES (?, ?, ?, ?)', [action.id, action.index, action.type, JSON.stringify(action.value)],
                      function(transaction, results) {
                        resolve(results);
                      },
                      function(transaction, error) {
                        reject(error);
                      })
                  }).bind(this)));
                }).bind(this));

                Promise.all(promises).then(function(results) {
                  resolve(results);
                })
                  .
                catch (function(error) {
                  reject(error);
                });
              }).bind(this),
              function(transaction, error) {
                reject(error);
              });

          }).bind(this));
        }).bind(this));
      }).bind(this));
    },

    removeRemoteActions: function(index, length) {
      return this._parent.readyPromise.then((function(server) {
        return new Promise((function(resolve, reject) {
          server.transaction((function(tx) {
            tx.executeSql('DELETE FROM `F' + this._fileId + '-remote` WHERE `index` between ? and ?', [index, index + length - 1], (function(transaction, results) {
                tx.executeSql('UPDATE `F' + this._fileId + '-remote` SET `index` = `index` - ? WHERE `index` >= ?', [length, index],
                  function(transaction, results) {
                    resolve(results);
                  },
                  function(transaction, error) {
                    reject(error);
                  });
              }).bind(this),
              function(transaction, error) {
                reject(error);
              }
            );
          }).bind(this));
        }).bind(this));
      }).bind(this));
    },

    replaceFileId: function(newId) {
      return this._parent._replaceFileId(this._fileId, newId)
        .then((function() {
          this._fileId = newId;
        }).bind(this)).
      catch (function(error) {
        console.error("Error replacing fileId", error);
        throw error;
      });

    },

    close: function() {
      this._fileId = null;

      return Promise.resolve();
    },

    updateLocalModifiedTime: function(time) {
      return this._parent._updateLocalModifiedTime(this._fileId, time);
    },

    updateDriveModifiedTime: function(time) {
      return this._parent._updateDriveModifiedTime(this._fileId, time);
    },
  });

  var WebSQLBacking = Class.extend({
    FIELDS: "id, name, localModifiedTime, driveModifiedTime, thumbnail",

    readyPromise: null,

    _serverName: null,

    init: function(serverName) {
      this._serverName = serverName ? serverName : "files";
      var server = openDatabase("draw", "", "draw", 4 * 1024 * 1024);
      this.readyPromise = Promise.resolve(server)
        .then((function(server) {
          return new Promise((function(resolve, reject) {
            server.transaction((function(tx) {
              tx.executeSql('CREATE TABLE IF NOT EXISTS `' + this._serverName + '`' +
                '(' +
                'id VARCHAR(255) PRIMARY KEY,' +
                'name VARCHAR(255),' +
                'localModifiedTime INTEGER,' +
                'driveModifiedTime VARCHAR(255),' +
                'thumbnail TEXT,' +
                'deleted BOOL' +
                ')', [],
                function() {
                  resolve(server)
                },
                function(transaction, error) {
                  reject(error);
                });
            }).bind(this));
          }).bind(this))
            .then((function() {
              // do sql migrations
              var sequence = Promise.resolve();

              if (server.version == "1.0") {
                sequence = sequence.then((function() {
                  return new Promise((function(resolve, reject) {
                    server.changeVersion(server.version, "2", (function(tx) {
                        tx.executeSql('DROP TABLE IF EXISTS `files`', [],
                          function() {
                            resolve()
                          },
                          function(transaction, error) {
                            reject(error);
                          })
                      }).bind(this),
                      function(error) {
                        reject(error);
                      })
                  }).bind(this))
                    .then(function() {
                      // just reload and start fresh
                      location.reload();
                    });
                }).bind(this))
              }

              return sequence;
            }).bind(this))
        }).bind(this))
        .then(function() {
          return server;
        })
        .
      catch (function(error) {
        console.error("Error initializing database", error);
        throw error;
      });
    },

    fileExists: function(fileId) {
      return this.readyPromise.then((function(server) {
        return new Promise((function(resolve, reject) {
          server.transaction((function(tx) {
            tx.executeSql('SELECT COUNT(*) AS count FROM `' + this._serverName + '` WHERE id = ?', [fileId], (function(transaction, results) {
                resolve(results.rows.item(0).count !== 0);
              }).bind(this),
              function(transaction, error) {
                reject(error);
              });
          }).bind(this));
        }).bind(this));
      }).bind(this));
    },


    getFiles: function() {
      return this.readyPromise.then((function(server) {
        return new Promise((function(resolve, reject) {

          server.readTransaction((function(tx) {
            tx.executeSql("SELECT " + this.FIELDS + " FROM `" + this._serverName + "` WHERE `deleted`='false' ORDER BY localModifiedTime DESC", [], (function(transaction, results) {
                var resultsObj = this._convertResultToObject(results);
                resolve(resultsObj);
              }).bind(this),
              function(transaction, error) {
                reject(error);
              });
          }).bind(this));
        }).bind(this));
      }).bind(this));
    },



    _addFile: function(file) {
      return this.readyPromise.then((function(server) {
        return new Promise((function(overallResolve, overallReject) {

          server.transaction((function(tx) {
            var promises = [];
            promises.push(new Promise((function(resolve, reject) {
              tx.executeSql('INSERT INTO `' + this._serverName + '` VALUES (?, ?, ?, ?, ?, ?)', [file.id, file.name, file.localModifiedTime, file.driveModifiedTime, file.thumbnail, false],
                function(transaction, results) {
                  resolve(results);
                },
                function(transaction, error) {
                  reject(error);
                });
            }).bind(this)));

            promises.push(new Promise((function(resolve, reject) {
              tx.executeSql('CREATE TABLE IF NOT EXISTS `F' + file.id + '-local` ' +
                '(id VARCHAR(255) PRIMARY KEY, type VARCHAR(255), value TEXT)', [],
                function(transaction, results) {
                  resolve(results);
                },
                function(transaction, error) {
                  reject(error);
                });
            }).bind(this)));

            promises.push(new Promise((function(resolve, reject) {
              tx.executeSql('CREATE TABLE IF NOT EXISTS `F' + file.id + '-remote` ' +
                '(id VARCHAR(255) PRIMARY KEY, `index` INTEGER, type VARCHAR(255), value TEXT)', [],
                function(transaction, results) {
                  resolve(results);
                },
                function(transaction, error) {
                  reject(error);
                });
            }).bind(this)));

            Promise.all(promises)
              .then(function(results) {
                overallResolve();
              })
              .
            catch (function(error) {
              overallReject(error);
            })
          }).bind(this));
        }).bind(this));
      }).bind(this));
    },

    _renameFile: function(fileId, newName) {
      return this.readyPromise.then((function(server) {
        return new Promise((function(resolve, reject) {
          server.transaction((function(tx) {
            tx.executeSql('UPDATE `' + this._serverName + '` SET name = ? WHERE id = ?', [newName, fileId], (function(transaction, results) {
                var resultsObj = this._convertResultToObject(results);
                resolve(resultsObj[0]);
              }).bind(this),
              function(transaction, error) {
                reject(error);
              });
          }).bind(this));
        }).bind(this));
      }).bind(this));
    },

    _updateThumbnail: function(fileId, dataURL) {
      return this.readyPromise.then((function(server) {
        return new Promise((function(resolve, reject) {
          server.transaction((function(tx) {
            tx.executeSql('UPDATE `' + this._serverName + '` SET thumbnail = ? WHERE id = ?', [dataURL, fileId], (function(transaction, results) {
                var resultsObj = this._convertResultToObject(results);
                resolve(resultsObj[0]);
              }).bind(this),
              function(transaction, error) {
                reject(error);
              });
          }).bind(this));
        }).bind(this));
      }).bind(this));
    },

    _replaceFileId: function(fileId, newId) {
      return this.readyPromise.then((function(server) {
        return new Promise((function(resolve, reject) {
          server.transaction((function(tx) {
            var promises = [];
            promises.push(new Promise((function(resolve, reject) {
              tx.executeSql('UPDATE `' + this._serverName + '` SET id = ? WHERE id = ?', [newId, fileId], (function(transaction, results) {
                  var resultsObj = this._convertResultToObject(results);
                  resolve(resultsObj[0]);
                }).bind(this),
                function(transaction, error) {
                  reject(error);
                });
            }).bind(this)));

            promises.push(new Promise(function(resolve, reject) {
              tx.executeSql('ALTER TABLE `F' + fileId + '-local` RENAME TO `F' + newId + '-local`', [],
                function(transaction, results) {
                  resolve(results);
                },
                function(transaction, error) {
                  reject(error);
                });
            }));

            promises.push(new Promise(function(resolve, reject) {
              tx.executeSql('ALTER TABLE `F' + fileId + '-remote` RENAME TO `F' + newId + '-remote`', [],
                function(transaction, results) {
                  resolve(results);
                },
                function(transaction, error) {
                  reject(error);
                });
            }));

            Promise.all(promises)
              .then(function(results) {
                resolve(results[0]);
              })
              .
            catch (function(error) {
              reject(error);
            })
          }).bind(this));
        }).bind(this));
      }).bind(this));
    },

    getDeletedFiles: function(callback) {
      return this.readyPromise.then((function(server) {
        return new Promise((function(resolve, reject) {
          server.readTransaction((function(tx) {
            tx.executeSql("SELECT " + this.FIELDS + " FROM `" + this._serverName + "` WHERE `deleted`='true' ORDER BY localModifiedTime DESC", [], (function(transaction, results) {
                var resultsObj = this._convertResultToObject(results);
                resolve(resultsObj);
              }).bind(this),
              function(transaction, error) {
                reject(error);
              });
          }).bind(this));
        }).bind(this));
      }).bind(this));
    },

    markFileAsDeleted: function(fileId) {
      return this.readyPromise.then((function(server) {
        return new Promise((function(resolve, reject) {
          server.transaction((function(tx) {
            tx.executeSql('UPDATE `' + this._serverName + '` SET deleted = ? WHERE id = ?', [true, fileId], (function(transaction, results) {
                var resultsObj = this._convertResultToObject(results);
                resolve(resultsObj[0]);
              }).bind(this),
              function(transaction, error) {
                reject(error);
              });
          }).bind(this));
        }).bind(this));
      }).bind(this));
    },

    unmarkFileAsDeleted: function(fileId) {
      return this.readyPromise.then((function(server) {
        return new Promise((function(resolve, reject) {
          server.transaction((function(tx) {
            tx.executeSql('UPDATE `' + this._serverName + '` SET deleted = ? WHERE id = ?', [false, fileId], (function(transaction, results) {
                var resultsObj = this._convertResultToObject(results);
                resolve(resultsObj[0]);
              }).bind(this),
              function(transaction, error) {
                reject(error);
              });
          }).bind(this));
        }).bind(this));
      }).bind(this));
    },

    deleteFile: function(fileId) {
      return this.readyPromise.then((function(server) {
        return new Promise((function(resolve, reject) {
          server.transaction((function(tx) {
            var promises = [];
            promises.push(new Promise((function(resolve, reject) {
              tx.executeSql('DELETE FROM `' + this._serverName + '` WHERE id = ?', [fileId], (function(transaction, results) {
                  var resultsObj = this._convertResultToObject(results);
                  resolve(resultsObj[0]);
                }).bind(this),
                function(transaction, error) {
                  reject(error);
                });
            }).bind(this)));

            promises.push(new Promise(function(resolve, reject) {
              tx.executeSql('DROP TABLE IF EXISTS `F' + fileId + '-local`', [], (function(transaction, results) {
                  resolve();
                }).bind(this),
                function(transaction, error) {
                  reject(error);
                });
            }));

            promises.push(new Promise(function(resolve, reject) {
              tx.executeSql('DROP TABLE IF EXISTS `F' + fileId + '-remote`', [], (function(transaction, results) {
                  resolve();
                }).bind(this),
                function(transaction, error) {
                  reject(error);
                });
            }));

            Promise.all(promises)
              .then(function(results) {
                resolve(results[0]);
              })
              .
            catch (function(error) {
              reject(error);
            })
          }).bind(this));
        }).bind(this));
      }).bind(this));
    },

    getFileInfo: function(fileId) {
      return this.readyPromise.then((function(server) {
        return new Promise((function(resolve, reject) {
          server.readTransaction((function(tx) {
            tx.executeSql('SELECT ' + this.FIELDS + ' FROM `' + this._serverName + '` WHERE id = ?', [fileId], (function(transaction, results) {
                var resultsObj = this._convertResultToObject(results);
                resolve(resultsObj[0]);
              }).bind(this),
              function(transaction, error) {
                reject(error);
              });
          }).bind(this));
        }).bind(this));
      }).bind(this));
    },

    _updateLocalModifiedTime: function(fileId, time) {
      return this.readyPromise.then((function(server) {
        return new Promise((function(resolve, reject) {
          server.transaction((function(tx) {
            tx.executeSql('UPDATE `' + this._serverName + '` SET localModifiedTime = ? WHERE id = ?', [time, fileId], (function(transaction, results) {
                var resultsObj = this._convertResultToObject(results);
                resolve(resultsObj[0]);
              }).bind(this),
              function(transaction, error) {
                reject(error);
              });
          }).bind(this));
        }).bind(this));
      }).bind(this));
    },

    _updateDriveModifiedTime: function(fileId, time) {
      return this.readyPromise.then((function(server) {
        return new Promise((function(resolve, reject) {
          server.transaction((function(tx) {
            tx.executeSql('UPDATE `' + this._serverName + '` SET driveModifiedTime = ? WHERE id = ?', [time, fileId], (function(transaction, results) {
                var resultsObj = this._convertResultToObject(results);
                resolve(resultsObj[0]);
              }).bind(this),
              function(transaction, error) {
                reject(error);
              });
          }).bind(this));
        }).bind(this));
      }).bind(this));
    },

    // JSON Decode should be an array of columns that have JSON that should be parsed
    _convertResultToObject: function(results, JSONDecode) {
      var rows = results.rows;
      var objArray = new Array(rows.length);

      for (var i = 0; i < rows.length; i++) {
        var item = rows.item(i);
        objArray[i] = Helpers.clone(item);

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

    clearAll: function() {
      return Promise.all([this.getFiles(), this.getDeletedFiles()])
        .then((function(results) {
          return results[0].concat(results[1]);
        }).bind(this))
        .then((function(files) {
          files.map((function(file) {
            return this.deleteFile(file.id);
          }).bind(this))

          return Promise.all(files).then((function() {
            return this.readyPromise;
          }).bind(this))
            .then((function(server) {
              return new Promise((function(resolve, reject) {
                server.transaction((function(tx) {
                  tx.executeSql('DROP TABLE `' + this._serverName + '`', [], (function(transaction, results) {
                      resolve();
                    }).bind(this),
                    function(transaction, error) {
                      reject(error);
                    });
                }).bind(this));
              }).bind(this));
            }).bind(this));
        }).bind(this))
    },

    instance: instance,
  });

  return WebSQLBacking;
});