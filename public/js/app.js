'use strict'

var app = angular.module('plunker', ['ui.sortable']);

app.controller('MainCtrl', function ($scope, $http) {
  var moving = false;
  window.globalScope = $scope;
  $scope.photos = getPhotoOrder();
  $scope.swapPhotos = [];

    $scope.photoSwap = {
        swapPairIndex: 1,
        getSwapPair: function () {
            var swapPairNumber = checkSwapPair($scope.photoSwap.swapPairIndex);

            return [
                $scope.photos[swapPairNumber],
                $scope.photos[swapPairNumber + 1]
            ];
        }
    };
  
    $scope.nextSwapPair = function () {
        $scope.photoSwap.swapPairIndex = checkSwapPair(++$scope.photoSwap.swapPairIndex);
        $scope.swapPhotos = $scope.photoSwap.getSwapPair();
    };

    $scope.previousSwapPair = function () {
        $scope.photoSwap.swapPairIndex = checkSwapPair(--$scope.photoSwap.swapPairIndex);
        $scope.swapPhotos = $scope.photoSwap.getSwapPair();
    };

    $scope.swap = function () {
        var swapPairNumber = checkSwapPair($scope.photoSwap.swapPairIndex);

        var cachedLeftPhoto = $scope.photos[swapPairNumber];
        var cachedRightPhoto = $scope.photos[swapPairNumber + 1];

        $scope.photos[swapPairNumber] = cachedRightPhoto;
        $scope.photos[swapPairNumber + 1] = cachedLeftPhoto;

        savePhotoOrder();

        $scope.swapPhotos = [
            cachedRightPhoto,
            cachedLeftPhoto
        ];
    };

  function checkSwapPair(num) {
    if (num >= $scope.photos.length - 1) {
        --num;
    }
    if (num < 1) {
        num = 1;
    }
    return num;
  }

  $scope.sortableOptions = {
    containment: '#sortable-container',
    additionalPlaceholderClass: 'col-xs-12',
    accept: function(sourceItemHandleScope, destSortableScope) {
        return true;
    },
    orderChanged: function(event) {
        savePhotoOrder();
    }
  };

  function savePhotoOrder() {
    var cachedPhotos = $scope.photos;

    $http.post('/images', cachedPhotos)
        .success(function(data, status, headers, config) {
            console.log('Photo order successfully saved: ', data);
        })
        .error(function(data, status, headers, config) {
            console.log('Photo order save failed. Reverting to localStorage if available.');

            if (Modernizr.localStorage) {
                window.localStorage.setItem("photoOrder", angular.toJson(cachedPhotos));
            }
        });
  };

  function getPhotoOrder() {
    $http.get('/images')
        .success(function (data, status, headers, config) {
            updatePhotos((data.length > 0) ? data : populateList());
        })
        .error(function (data, status, headers, config) {
            console.log('Error getting images from server.');

            if (Modernizr.localStorage) {
                try {
                    var localPhotoOrder = angular.fromJson(window.localStorage.getItem("photoOrder"));

                    if (localPhotoOrder !== null) {
                        updatePhotos(localPhotoOrder);
                    }
                } catch (e) {
                    return populateList();
                }
            }
        });

    return populateList();
  };

  function populateList() {
    var array = [];
    for (var i = 1; i <= 10; i++) {
      array.push({url: "/images/" + i + ".jpg"});
    }

    return array;
  }

  function updatePhotos(array) {
    $scope.photos = array;
    $scope.swapPhotos = $scope.photoSwap.getSwapPair();
  }
}).directive('slidebox', function slideboxDirective () {
    return {
        template: '<div class="slidebox-container">' +
                    '<div class="slidebox">' +
                      '<div ng-transclude class="slidebox-content"></div>' +
                    '</div>' +
                    '<div class="slidebox-controls slidebox-up"></div>' +
                    '<div class="slidebox-controls slidebox-down"></div>' +
                  '</div>',
        replace: true,
        transclude: true,
        restrict: 'AE',
        scope: false,
        link: function (scope, element, attrs) {
            var content = element.children()[0],
                upEl = element.children()[1],
                downEl = element.children()[2],
                body = document.getElementsByTagName('body')[0],
                velocity = 0,
                defaultOpacity = Number(getComputedStyle(upEl).opacity),
                maxVelocity = Number(attrs.speed) || 25,
                interval,
                didScroll = true,
                isScrolling = false; // trigger an initial check on load

            if (attrs.contentHeight) {
                scope.$watch(attrs.contentHeight, function (value) {
                    if (value == Number(value)) {
                        value += 'px';
                    }
                    content.children[0].style.height = value;
                    didScroll = true;
                });
            }
            if (attrs.contentClass) {
                content.children[0].className += ' ' + attrs.contentClass;
            }

            function startScroll (isUp) {
                // set default velocity for touchdevices
                if (isUp) {
                    velocity = maxVelocity / -2;
                } else {
                    velocity = maxVelocity / 2;
                }
                if (isScrolling) return;
                interval = setInterval(function () {
                    body.scrollTop += velocity;
                    didScroll = true;
                    isScrolling = true;
                }, 50);
            }

            function stopScroll (controlEl) {
                clearInterval(interval);  
                isScrolling = false;
                controlEl.style.opacity = defaultOpacity;
                velocity = 0;
            }

            function touchStart (controlEl, isUp) {
                startScroll();
                if (isUp) {
                    velocity = maxVelocity / -2;
                } else {
                    velocity = maxVelocity / 2;
                }
                controlEl.style.opacity = 1.0;
            }

            /**
             * Get scalar between 0 and 1 based on mouse position in element
             */
            function getVelocityScalar (element, clientY) {
                var height = element.offsetHeight,
                    topSide = element.getBoundingClientRect().top;
                return (clientY - topSide) / height;
            };

            function updateVelocity (controlEl, yPos, isUp) {
                var scale = getVelocityScalar(controlEl, yPos),
                    round,
                    opacityScalar;

                if (isUp) {
                    // scale is % from the top side; convert to negative %
                    // from the bottom:
                    scale -= 1;

                    controlEl.style.opacity = defaultOpacity + scale * -1;
                    round = Math.floor;
                } else {
                    controlEl.style.opacity = defaultOpacity + scale;
                    round = Math.ceil;
                }

                velocity = round(scale * maxVelocity);
            }

            /**
             * Hide control when scrolled all the way to the end
             */
            function updateControlVisability () {
                if (!didScroll) {
                    return;
                }

                if (body.scrollTop === 0) {
                    upEl.style.display = 'none';
                } else {
                    upEl.style.display = 'block';
                }

                if (body.scrollTop + window.innerHeight - content.offsetHeight === 0) {
                    downEl.style.display = 'none';
                } else {
                    downEl.style.display = 'block';
                }

                didScroll = false;
            }

            upEl.addEventListener('mouseover', function () {
                startScroll();
            }, false);
            upEl.addEventListener('mousemove', function (event) {
                updateVelocity(upEl, event.clientY, true);
            }, false);
            upEl.addEventListener('mouseout', function () {
                stopScroll(upEl);
            }, false);
            upEl.addEventListener('touchstart', function (event) {
                event.preventDefault(); // cancel mouse event
                touchStart(upEl, true);
            }, false);
            upEl.addEventListener('touchend', function (event) {
                event.preventDefault(); // cancel mouse event
                stopScroll(upEl);
            }, false);

            downEl.addEventListener('mouseover', function () {
                startScroll();
            });
            downEl.addEventListener('mousemove', function (event) {
                updateVelocity(downEl, event.clientY, false);
            });
            downEl.addEventListener('mouseout', function  () {
                stopScroll(downEl);
            }, false);
            downEl.addEventListener('touchstart', function (event) {
                event.preventDefault(); // cancel mouse event
                touchStart(downEl, false);
            }, false);
            downEl.addEventListener('touchend', function (event) {
                event.preventDefault(); // cancel mouse event
                stopScroll(downEl);
            }, false);
            content.addEventListener('scroll', function () {
                didScroll = true;
            });

            body.addEventListener('touchmove', function (event) {
                var screenY = event.touches[0].clientY;
                if (screenY > (window.innerHeight * .9)) {
                  touchStart(downEl, false);
                  return;
                } else if (screenY < (window.innerHeight * .1)) {
                  touchStart(upEl, true);
                  return;
                } else {
                  stopScroll(downEl);
                  stopScroll(upEl);
                }
            }, false);
            window.onscroll = windowScroll;

            function windowScroll() {
                if (body.scrollTop === 0) {
                    upEl.style.display = 'none';
                } else {
                    upEl.style.display = 'block';
                }

                if (body.scrollTop + window.innerHeight - content.offsetHeight >= 0) {
                    downEl.style.display = 'none';
                } else {
                    downEl.style.display = 'block';
                }
            };

            setInterval(updateControlVisability, 250);
        }
    };
});