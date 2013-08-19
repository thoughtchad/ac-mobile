'use strict';

angular.module('CACMobile')
  .controller('RegionDetailsCtrl', function ($scope, $routeParams, Forecast) {

    function getForecast() {    
        Forecast.get($scope.region).then(
                    function(data){
                        
                         //data = data_;
                         //$scope.data = data;

                         //! \todo assumes ordered list and assumes recent  checks against the dates should be made her instead of assuming that bulletin has been published !
                         $scope.today = data.bulletinResultsOf.BulletinMeasurements.dangerRatings.DangerRating_asArray[0];
                         $scope.tomorrow = data.bulletinResultsOf.BulletinMeasurements.dangerRatings.DangerRating_asArray[1];
                         $scope.dayAfter = data.bulletinResultsOf.BulletinMeasurements.dangerRatings.DangerRating_asArray[2];
                                         
                    },
                    function(error){
                        alert('error gettin forecast', error);
                    }
                    
            );
    } // end function getForecast
    
    $scope.region = $routeParams.region;
    getForecast();
    


  });
