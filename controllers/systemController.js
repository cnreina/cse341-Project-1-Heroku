const fileObject = require('fs');

exports.deleteFile = (filePath) => {
  fileObject.unlink(filePath, (err) => {
        if (err) {throw (err);};
    });
};
