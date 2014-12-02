angular.module('acMobile.controllers')
    .filter('trimLocation', function() {
        return function(string, maxlength) {
            return string.substr(0, maxlength);
        };
    })
    .controller('ReportCtrl', function($scope, $rootScope, auth, store, $q, $http, $timeout, $state, $ionicPlatform, $ionicPopup, $ionicLoading, $ionicActionSheet, $ionicModal, $cordovaGeolocation, $cordovaNetwork, $cordovaSocialSharing, $cordovaCamera, $cordovaFile, acReport, fileArrayCreator, MAPBOX_ACCESS_TOKEN, MAPBOX_MAP_ID) {
        //Cordova setup
        var Camera = navigator.camera;
        $scope.isMobile = function() {
            if (window.cordova) {
                return true;
            } else {
                return true;
            }
        };
        //display form sections
        $scope.display = {
            "ridingInfo": false,
            "avalancheConditions": false
        };

        $scope.tempLocation = {
            lat: "",
            lng: ""
        };
        var map;
        var marker;
        var popup;


        // $scope.ridingConditions = ridingConditionsData;
        // $scope.report = {
        //     title: "",
        //     datetime: moment().format('YYYY-MM-DDTHH:mm:ss'),
        //     location: [],
        //     images: [],
        //     files: [],
        //     ridingConditions: angular.copy(ridingConditionsData),
        //     avalancheConditions: {
        //         'slab': false,
        //         'sound': false,
        //         'snow': false,
        //         'temp': false
        //     },
        //     comments: ""
        // };
        // $scope.resetReport = function() {
        //     $scope.report = {
        //         title: "",
        //         datetime: moment().format('YYYY-MM-DDTHH:mm:ss'),
        //         location: [],
        //         images: [],
        //         files: [],
        //         ridingConditions: ridingConditionsData,
        //         avalancheCondtions: {
        //             'slab': false,
        //             'sound': false,
        //             'snow': false,
        //             'temp': false
        //         },
        //         comments: ""
        //     };
        // };

        function sharePopup(link) {
            $scope.sharePopup = $ionicPopup.show({
                templateUrl: 'templates/post-share.html',
                title: "Observation report saved",
                subTitle: "Share your report",
                scope: $scope
            });
            $scope.sharePopup.then(function(provider) {
                var message = "Check out my Mountain Information Network Report: ",
                    image = null;

                if (provider == "twitter") {
                    $cordovaSocialSharing
                        .shareViaTwitter(message, image, link)
                        .then(function(result) {
                            //console.log(result);
                        }, function(err) {
                            //console.log(err);
                        });
                } else if (provider == "facebook") {
                    //This implementation is an option...
                    // window.plugins.socialsharing.shareViaFacebookWithPasteMessageHint(message + " " + link, null /* img */ , null /* url */ , 'The report has been copied to your clipboard. Please paste the report', function(msg) {
                    //     //Android: Always returns here, regardless of if they cancelled the native dialog.
                    //     console.log(msg);
                    //     console.log('share ok');
                    // }, function(errormsg) {
                    //     console.log(errormsg);
                    // });
                    $cordovaSocialSharing
                        .shareViaFacebook(message + " " + link, image, link)
                        .then(function(result) {
                            // console.log(result);
                        }, function(err) {
                            // console.log(err);
                        });
                } else if (provider == "skip") {

                } else if (provider == "googleplus") {
                    //experimental - not enabled yet!
                    window.plugins.socialsharing.shareVia('com.google.android.apps.plus', message, null, null, link, function() {
                        // console.log('share ok');
                    }, function(msg) {
                        // console.log("share error: " + msg);
                    });
                } else {
                    window.plugins.socialsharing.share(message, null, null, link, function() {
                        //success
                        // console.log("share ok");
                    }, function(msg) {
                        //fail
                        // console.log("share error: " + msg);
                    });
                }
            });
        }

        //onFormSubmit
        // if (auth.isAuthenticated) {
        //         $ionicLoading.show({
        //             template: '<i class="fa fa-circle-o-notch fa-spin"></i> Sending report'
        //         });


        $scope.submitReport = function() {
            // todo enable online check
            // if ($cordovaNetwork.isOnline()){

            //if online, we must be signed in to submit the report, so let's check that:
            if (auth.isAuthenticated) {
                $ionicLoading.show({
                    template: '<i class="fa fa-circle-o-notch fa-spin"></i> Sending report'
                });
                //validate we are logged in
                //todo validation step
                acReport.prepareData($scope.report)
                    .then(acReport.sendReport)
                    .then(function(result) {
                        console.log("submission: " + result.data.subid);
                        //TODO-JPB: prepare URL
                        var link = "http://avalanche-canada-qa.elasticbeanstalk.com/api/min/submissions/" + result.data.subid;
                        $ionicLoading.hide();
                        sharePopup(link);
                        //TODO-JPB: uncomment this so that the report data is reset when sent
                        //$scope.resetReport();
                    })
                    .catch(function(error) {
                        console.log(error);
                        $ionicLoading.hide();
                    });

            } else {
                //not authenticated - so let's prompt them to go sign in with a popup.
                var confirmPopup = $ionicPopup.confirm({
                    title: 'You must be logged in to submit a report',
                    template: 'Would you like to log in now?',
                    cancelType: "button-outline button-energized",
                    okType: "button-energized"
                });
                confirmPopup.then(function(res) {
                    if (res) {
                        login();
                    } else {
                        console.log('User does not want to log in');
                    }
                });
            }

            //}
            // else {
            //      $ionicLoading.show({duration:3000, template: '<i class="fa fa-chain-broken"></i> <p>You must be connected to the network to submit reports. Please try later.</p>'});
            // }
        };


        $scope.showLocationSheet = function() {
            var hideSheet = $ionicActionSheet.show({
                buttons: [{
                    text: "Use my location"
                }, {
                    text: "Pick position on map"
                }],
                titleText: "Report Location",
                cancelText: "Cancel",
                buttonClicked: function(index) {
                    if (index === 0) {
                        getLocation()
                            .then(function() {
                                hideSheet();
                            });
                    } else if (index === 1) {
                        hideSheet();
                        if ($cordovaNetwork.isOnline()) {
                            $scope.showLocationModal();
                        } else {
                            $ionicLoading.show({
                                duration: 3000,
                                template: '<i class="fa fa-chain-broken"></i> <p>You must be connected to the network to pick from a map.</p>'
                            });

                        }
                    }
                }
            });
        };

        function login() {
            //TODO-JPB : this is repetive, we should extract to a service.
            auth.signin({
                authParams: {
                    scope: 'openid profile offline_access',
                    device: 'Mobile device'
                }
            }, function(profile, token, accessToken, state, refreshToken) {
                store.set('profile', profile);
                store.set('token', token);
                store.set('refreshToken', refreshToken);
                $rootScope.$broadcast('userLoggedIn');

            }, function(error) {
                // Oops something went wrong during login:
                console.log("There was an error logging in", error);
            });
        }

        function getLocation() {
            var options = {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            };
            return $ionicPlatform.ready()
                .then(function() {
                    $ionicLoading.show({
                        template: '<i class="fa fa-circle-o-notch fa-spin"></i> Acquiring Position',
                        delay: 100
                    });
                    return $cordovaGeolocation.getCurrentPosition(options);
                })
                .then(function(position) {
                    $ionicLoading.hide();
                    $scope.report.latlng = [position.coords.latitude, position.coords.longitude];
                })
                .catch(function(error) {
                    $ionicLoading.hide();
                    $ionicLoading.show({
                        template: 'There was a problem getting your position',
                        duration: 3000
                    });
                    console.error("GeoLocation Error" + error);
                    return $q.reject(error);
                });
        }

        $ionicModal.fromTemplateUrl('templates/location-modal.html', {
            scope: $scope,
            animation: 'slide-in-up'
        }).then(function(modal) {
            $scope.locationModal = modal;
        });

        $scope.showLocationModal = function() {
            //TODO-JPB: Make sure they are online otherwise they cannot view the map.
            // if ($cordovaNetwork.isOnline()) {
            $scope.locationModal.show()
                .then(function() {
                    if (!map) {
                        L.mapbox.accessToken = MAPBOX_ACCESS_TOKEN;
                        map = L.mapbox.map('map', MAPBOX_MAP_ID, {
                            attributionControl: false
                        });
                        map.on('click', onMapClick);
                    }
                });
            // } else {
            //     $ionicLoading.show({
            //         duration: 3000,
            //         template: '<i class="fa fa-chain-broken"></i> <p>You must be connected to the network to submit reports. Please try later.</p>'
            //     });
            // }
        };

        function onMapClick(e) {
            if (!marker) {
                $scope.$apply(function() {
                    $scope.tempLocation.lat = e.latlng.lat;
                    $scope.tempLocation.lng = e.latlng.lng;
                });
                var latlng = new L.LatLng(e.latlng.lat, e.latlng.lng);

                marker = L.marker(latlng, {
                    icon: L.mapbox.marker.icon({
                        'marker-color': 'f79118'
                    }),
                    draggable: true
                });

                marker
                    .bindPopup('Position: ' + e.latlng.toString().substr(6) + '<br/>(drag to relocate)')
                    .addTo(map)
                    .openPopup();

                marker.on('dragend', function(e) {
                    var position = marker.getLatLng();
                    $scope.$apply(function() {
                        $scope.tempLocation.lat = position.lat;
                        $scope.tempLocation.lng = position.lng;
                    });
                    marker.setPopupContent('Position: ' + position.toString().substr(6) + '<br/>(drag to relocate)');
                    marker.openPopup();
                });
            }
        }
        $scope.cancelLocationModal = function() {
            $scope.locationModal.hide();
        };

        $scope.confirmLocation = function() {
            if ($scope.tempLocation.lat) {
                $scope.report.latlng = [$scope.tempLocation.lat, $scope.tempLocation.lng];
                $scope.locationModal.hide();
            } else {
                $ionicLoading.show({
                    duration: 2000,
                    template: '<i class="fa fa-exclamation-triangle"></i> You have not selected a position yet'
                });
            }
        };

        function takePicture(options) {
            return $ionicPlatform.ready()
                .then(function() {
                    return $cordovaCamera.getPicture(options);
                })
                .then(fileArrayCreator.processImage)
                .then(function(fileBlob) {
                    $scope.report.files.push(fileBlob);
                    $ionicLoading.show({
                        duration: 1000,
                        template: '<i class="fa fa-camera"></i> Picture attached'
                    });
                })
                .catch(function(error) {
                    console.log(error);
                });
        }

        $scope.showPictureSheet = function() {
            var options = {};
            var hidePictureSheet = $ionicActionSheet.show({
                buttons: [{
                    text: "Take picture"
                }, {
                    text: "Attach existing picture"
                }],
                titleText: "Add a picture",
                cancelText: "Cancel",
                buttonClicked: function(index) {
                    if (index === 0) {
                        hidePictureSheet();
                        options = {
                            quality: 75,
                            destinationType: Camera.DestinationType.FILE_URI,
                            sourceType: Camera.PictureSourceType.CAMERA,
                            allowEdit: false,
                            encodingType: Camera.EncodingType.JPEG,
                            targetWidth: 640,
                            targetHeight: 480,
                            saveToPhotoAlbum: true
                        };
                        takePicture(options);

                    } else if (index === 1) {
                        hidePictureSheet();
                        options = {
                            quality: 75,
                            destinationType: Camera.DestinationType.FILE_URI,
                            sourceType: Camera.PictureSourceType.PHOTOLIBRARY,
                            allowEdit: true,
                            encodingType: Camera.EncodingType.JPEG,
                            targetWidth: 640,
                            targetHeight: 480,
                            saveToPhotoAlbum: true
                        };
                        takePicture(options);
                    }
                }
            });
        };

        $scope.$on('$destroy', function() {
            $scope.locationModal.remove();
        });

    });