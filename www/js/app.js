angular.module('acMobile.services', ['ngCordova']);
angular.module('acMobile.directives', ['acComponents']);
angular.module('acMobile.controllers', ['acComponents']);
//angular.module('acComponents').constant('AC_API_ROOT_URL', 'http://www.avalanche.ca');
angular.module('acComponents').constant('AC_API_ROOT_URL', 'http://avalanche-canada-dev.elasticbeanstalk.com');
angular.module('acMobile', ['ionic', 'ngCordova', 'auth0', 'angular-storage', 'angular-jwt', 'acMobile.services', 'acMobile.controllers', 'acMobile.directives', 'acComponents'])
    .config(function(authProvider, $httpProvider, jwtInterceptorProvider) {

        authProvider.init({
            domain: 'avalancheca.auth0.com',
            clientID: 'mcgzglbFk2g1OcjOfUZA1frqjZdcsVgC'
        });

        jwtInterceptorProvider.tokenGetter = function(store, jwtHelper, auth) {
            var idToken = store.get('token');
            var refreshToken = store.get('refreshToken');

            // If no token return null
            if (!idToken || !refreshToken) {
                return null;
            }
            //If token is expired, get a new one
            if (jwtHelper.isTokenExpired(idToken)) {
                return auth.refreshIdToken(refreshToken).then(function(idToken) {
                    store.set('token', idToken);
                    return idToken;
                });
            } else {
                return idToken;
            }
        };
        $httpProvider.interceptors.push('jwtInterceptor');

    })
    .constant('GA_ID', 'UA-4857222-16')
    .constant('AC_API_ROOT_URL', 'http://avalanche-canada-dev.elasticbeanstalk.com')
//.constant('AC_API_ROOT_URL', 'http://www.avalanche.ca')
.constant('MAPBOX_ACCESS_TOKEN', 'pk.eyJ1IjoiYXZhbGFuY2hlY2FuYWRhIiwiYSI6Im52VjFlWW8ifQ.-jbec6Q_pA7uRgvVDkXxsA')
    .constant('MAPBOX_MAP_ID', 'tesera.jbnoj7kp')
    .run(function($ionicPlatform, auth) {
        auth.hookEvents();

        $ionicPlatform.ready(function() {
            // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
            // for form inputs)
            if (window.cordova && window.cordova.plugins.Keyboard) {
                cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
            }
            if (window.StatusBar) {
                // org.apache.cordova.statusbar required
                StatusBar.styleDefault();
            }
        });
    })
    .run(function($rootScope, $timeout, $http, $state, auth, store, jwtHelper, acTerms, $cordovaNetwork, $cordovaGoogleAnalytics, $ionicLoading, $ionicPlatform, $ionicPopup, $templateCache, GA_ID) {

        $ionicPlatform.ready().then(function() {

            $cordovaGoogleAnalytics.startTrackerWithId(GA_ID).then(function() {
                console.log("initialized analytics");
            });

            $ionicPlatform.registerBackButtonAction(function() {
                var confirmPopup = $ionicPopup.confirm({
                    title: 'Exit Avalanche Canada?',
                    template: '',
                    cancelType: "button-outline button-energized",
                    okType: "button-energized"
                });
                confirmPopup.then(function(res) {
                    if (res) {
                        navigator.app.exitApp();
                    } else {

                    }
                });
            }, 100);

            var deRegisterAuthClose;
            auth.config.auth0lib.on('shown', function() {
                deRegisterAuthClose = $ionicPlatform.registerBackButtonAction(function() {
                    auth.config.auth0lib.hide();
                }, 101);
            });
            auth.config.auth0lib.on('hidden', function() {
                deRegisterAuthClose();
            });
        });

        $rootScope.$on('$locationChangeStart', function() {
            //TODO-JPB-OK only do this if the user is online.
            if (!auth.isAuthenticated) {
                var token = store.get('token');
                var refreshToken = store.get('refreshToken');
                if (token && refreshToken) {
                    if (!jwtHelper.isTokenExpired(token)) {
                        auth.authenticate(store.get('profile'), token);
                    } else {
                        return auth.refreshIdToken(refreshToken).then(function(idToken) {
                            store.set('token', idToken);
                        });
                    }
                }
            }
        });

        $rootScope.$on('$stateChangeStart', function(event, toState, toParams, fromState, fromParams) {
            if (toState.name != 'app.terms' && !acTerms.termsAccepted()) {
                console.log("Terms not accepted - re-routing to terms");
                event.preventDefault();
                $state.go('app.terms');
            }
            if (toState.data && toState.data.requiresOnline) {
                $ionicPlatform.ready()
                    .then(function() {
                        if ($cordovaNetwork.isOffline()) {
                            // $ionicLoading.show({
                            //     duration: 5000,
                            //     template: "<i class='fa fa-chain-broken'></i> No network connection. Some portions of the app will not function without a connection."
                            // });
                            $state.go('app.offline');
                        }
                    });
            }
        });

        $rootScope.$on('$stateChangeError', function(event, toState, toParams, fromState, fromParams, error) {
            event.preventDefault();
            $ionicPlatform.ready()
                .then(function() {
                    if ($cordovaNetwork.isOffline()) {
                        $state.go('app.offline');
                    } else {
                        //generic API error most likely
                        $ionicLoading.show({
                            duration: 5000,
                            template: "<i class='fa fa-warning'></i> We encountered an error, please try again."
                        });
                    }
                });
        });

        $rootScope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams) {
            $cordovaGoogleAnalytics.trackView(toState.data.analyticsName);
        });


        $timeout(function() {
            $http.get('templates/min-report-form.html')
                .success(function(result) {
                    $templateCache.put("min-report-form.html", result);
                })
                .error(function(error) {
                    //console.log(error);
                });
        }, 250);

    });