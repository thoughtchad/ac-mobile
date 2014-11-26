angular.module('acMobile.services', ['ngCordova']);
angular.module('acMobile.directives', ['acComponents']);
angular.module('acMobile.controllers', ['acComponents']);
//angular.module('acComponents').constant('AC_API_ROOT_URL', 'http://avalanche-canada-env.elasticbeanstalk.com');
angular.module('acMobile', ['ionic', 'ngCordova', 'auth0', 'angular-storage', 'angular-jwt', 'acMobile.services', 'acMobile.controllers', 'acMobile.directives', 'acComponents'])
    .config(function(authProvider, $httpProvider, jwtInterceptorProvider) {

        authProvider.init({
            domain: 'avalancheca.auth0.com',
            clientID: 'mcgzglbFk2g1OcjOfUZA1frqjZdcsVgC'
        });

        // TODO-JPB: change login events to use this one
        // authProvider.on('loginSuccess', function() {

        // });

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
    .constant('AC_API_ROOT_URL', 'http://avalanche-canada-env.elasticbeanstalk.com')
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

.run(function($rootScope, auth, store, jwtHelper, acTerms, $state, $cordovaNetwork, $ionicLoading, $ionicPlatform, $ionicPopup) {

    //
    $ionicPlatform.ready().then(function() {
        //TODO-JPB: create a state for signin on the rootscope and prevent the back button from doing anything here.
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
    });

    //

    $rootScope.$on('$locationChangeStart', function() {
        //TODO-JPB only do this if the user is online.
        //pull authenticated data from local storage, if they have an old token, fetch a new one immediately.
        if (!auth.isAuthenticated) {
            var token = store.get('token');
            if (token) {
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
        if (toState.name != 'app.terms' && toState != 'app.loading' && !acTerms.termsAccepted()) {
            console.log("Terms not accepted - re-routing to terms");
            event.preventDefault();
            $state.go('app.terms');
        }
        if (toState.data && toState.data.requiresOnline) {
            $ionicPlatform.ready()
                .then(function() {
                    // TODO-JPB: re-enable online checks
                    // if ($cordovaNetwork.isOffline()) {
                    //     $ionicLoading.show({
                    //         duration: 5000,
                    //         template: "<i class='fa fa-chain-broken'></i> No network connection. Some portions of the app will not function without a connection."
                    //     });
                    // }
                });
        }
    });
});
