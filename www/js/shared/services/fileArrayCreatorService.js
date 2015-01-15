angular.module('acMobile.services')
    .service('fileArrayCreator', function($cordovaFile, $q) {
        this.processImage = function(imagePath, ignoreErrors) {
            ignoreErrors = ignoreErrors || false;
            return $cordovaFile.readFileMetadataAbsolute(imagePath)
                .then(createBlob)
                .catch(function(error) {
                    if (!ignoreErrors) {
                        return $q.reject(error);
                    }
                    return $q.when(false);
                });
        };

        // these functions are used to cache an image if the device allows edits
        // this.storeFiles = function(report, queueIndex) {
        //     return $cordovaFile.createDir('avalanche', false)
        //         .then(function() {
        //             var promises = [];
        //             angular.forEach(report.files, function(data) {
        //                 var filepath = 'avalanche/' + moment.unix() + '-img';
        //                 promises.push(writeFile(filepath, data));
        //             });
        //             return $q.all(promises);
        //         });
        // };


        // function writeFile(filepath, data) {
        //     console.log('writing:' + filepath);
        //     return $cordovaFile.writeFile(filepath, data, {})
        //         .then(function(result) {
        //             console.log("wrote file:" + filepath);
        //             return $q.when(filepath);
        //         })
        //         .catch(function(error) {
        //             console.log(angular.toJson(error));
        //             console.log("error writing file.");
        //             return $q.when(false);
        //         });
        // }

        function createBlob(file) {
            var deferred = $q.defer();
            var reader = new FileReader();
            reader.onloadend = readSuccess(deferred, file);
            reader.onerror = readError(deferred);
            reader.readAsArrayBuffer(file);
            return deferred.promise;
        }

        function getType(filename) {
            var arr = filename.split(".");
            if (arr.length === 1) {
                return 'image/jpeg';
            } else {
                var ext = arr.pop();
                if (ext === "jpg" || "jpeg") {
                    return 'image/jpeg';
                } else if (ext === "png") {
                    return 'image/png';
                } else {
                    return 'image/jpeg';
                }
            }
        }

        function readSuccess(deferred, file) {
            return function(event) {
                var fileType;
                fileType = file.type || getType(file.name);

                var newBlob = new Blob([event.target.result], {
                    type: fileType,
                    size: file.size
                });

                deferred.resolve(newBlob);
            };
        }

        function readError(deferred) {
            return function(error) {
                deferred.reject(error);
            };
        }
    });