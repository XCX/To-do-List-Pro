google.load('visualization', '1', {packages:['corechart']});

var app = angular.module('to-do', ['ui.bootstrap', 'xeditable', 'googlechart'])
// angular service
.factory('todoService', ['$http', '$filter', function($http, $filter) {
	var today = $filter("date")(Date.now(), 'yyyy-MM-dd');
	var o = {
		todos: [],
		todayTodos: [],
		upcomingTodos: [],
		pastTodos: [],
        twilioInfo: []
	};
	o.getAll = function() {
		return $http.get('/todos')
			.success(function(data) {
				angular.copy(data, o.todos);
			})
			.then(function(result) {
				o.grouping(result.data);
			});
	};
    o.getLen = function() {
        $http.get('/todos')
            .success(function(data) {
                return data.length;
            })
    }	
	o.grouping = function(items) {
        o.len = items.length;
		items.forEach(function(todo, i) {
			if (today===todo.date) {
				o.todayTodos.push(todo);
			} else if (today<todo.date) {
				o.upcomingTodos.push(todo);
			} else {
				o.pastTodos.push(todo);
			}
		})
	}
	o.create = function(todo) {
		return $http.post('/todos', todo).success(function(todo) {
			o.todos.push(todo);
			if (today===todo.date) {
				o.todayTodos.push(todo);
			} else if (today<todo.date) {
				o.upcomingTodos.push(todo);
			} else {
				o.pastTodos.push(todo);
			}
		});
	};
	o.updateStatus = function(todo) {
		return $http.put('/todos/' + todo._id + '/switchStatus', todo);
	}
	o.updateContent = function(todo) {
		return $http.put('/todos/' + todo._id + '/editContent', todo);
	}
	
	o.delete = function(todo) {		
		return $http.delete('/todos/' + todo._id).success(function(todos) {
			var index = o.todos.indexOf(todo);
			o.todos.splice(index, 1)
			if (todo.date === today) {
				var i = o.todayTodos.indexOf(todo);
				o.todayTodos.splice(i, 1);
			} else if (today<todo.date) {
				var i = o.upcomingTodos.indexOf(todo);
				o.upcomingTodos.splice(i, 1);
			} else {
				var i = o.pastTodos.indexOf(todo);
				o.pastTodos.splice(i, 1);
			}
		});
	}

    o.twilioGet = function() {
        return $http.get('twilio').success(function(data){
            angular.copy(data, o.twilioInfo);
        })
    }
    o.twilioPost = function(configInfo) {
        return $http.post('/twilio', configInfo);
    }
	return o;
}])
// main ctrl
.controller('MainCtrl', [
'$scope', 
'$filter', 
'$modal',
'todoService', 
'$rootScope',
function($scope, $filter, $modal, todoService, $rootScope){
	// get all todos
	todoService.getAll().then(function() {
		$scope.todos = todoService.todos;
    	$scope.todayTodos = todoService.todayTodos;
    	$scope.upcomingTodos = todoService.upcomingTodos;
    	$scope.pastTodos = todoService.pastTodos;
	});
	// update todos status
	$scope.switchStatus = function() {
		todoService.updateStatus(this.todo).then(function(data){
            $scope.todos.forEach(function(todo) {
                if (todo.title === data.data.title) {
                    return todo.done = data.data.done;
                }
            })
		})
    }
	// x-editable update todos content
	$scope.saveChange = function() {
		todoService.updateContent(this.__proto__.todo);
	}
	$scope.deleteTodo = function() {
		todoService.delete(this.todo);
	}
	$scope.search = function() {		
		if (!$scope.searchText.title.length) {
			$scope.showSearchRes = false;
		} else {
			$scope.showSearchRes = true;			
		}
	}
    $scope.items = ['item1', 'item2', 'item3'];
    $scope.openModal = function() {
        var modalInstance = $modal.open({
              templateUrl: 'myModalContent.html',
              controller: 'ModalInstanceCtrl',
              size: 'sm',
        });
    }         
}])
// modal controller
.controller('ModalInstanceCtrl', [
'$scope', 
'$modalInstance', 
'todoService', 
function ($scope, $modalInstance, todoService) {
    todoService.twilioGet().then(function() {
        if (todoService.twilioInfo.length) {
            $scope.twilioName = todoService.twilioInfo[0].name;
            $scope.twilioTel = todoService.twilioInfo[0].tel;
            $scope.twilioAllow = todoService.twilioInfo[0].push;
        }
    })
    $scope.twilioSubmit = function() {
        todoService.twilioPost({
            name: $scope.twilioName,
            tel: $scope.twilioTel.replace(/[^0-9]/g, ""),
            push: $scope.twilioAllow
        })
        $modalInstance.close();
    }
    $scope.cancel = function () {
        $modalInstance.dismiss('cancel');
    };
}])
// form ctrl
.controller('FormCtrl', [
'$scope', 
'$filter',
'todoService', 
function ($scope, $filter, todoService) {
	// datepicker 
	$scope.today = function() {
	   $scope.dt = $filter('date')(new Date(), 'yyyy-MM-dd');
	};
	$scope.today();
	$scope.clear = function () {
	  $scope.dt = null;
	};

	$scope.minDate = new Date();

	$scope.open = function($event) {
	  $event.preventDefault();
	  $event.stopPropagation();

	  $scope.opened = true;
	};

	$scope.dateOptions = {
	  formatYear: 'yy',
	  startingDay: 1
	};

	$scope.format = 'yyyy-MM-dd';
	
	// input
	$scope.addTodo = function() {
		if ($scope.title === '') {
			return; 
		}
		todoService.create({
			title: $scope.title,
			date:  $filter("date")($scope.dt, 'yyyy-MM-dd')
		});
		$scope.title = '';
		$scope.today();
	};
}])
// chart directive
.directive('gChart', function() {
	return {
		restrict: 'A',
		link: function($scope, elm, attrs) {
            var dateFilter = function(d) {
                var current = new Date();
                return new Date(current.getFullYear(), current.getMonth(), current.getDate() - d);
            }

            $scope.$watch('todos',function(newValues, oldValues, scope) {
                var todos = [];
                var alltimeClosed = 0;
                var alltimeOpen = 0;
                var thisWeekClosed = 0;
                var thisWeekOpen = 0;
                var lastWeekClosed = 0;
                var lastWeekOpen = 0;
                var thisMonthClosed = 0;
                var thisMonthOpen = 0;
                if ($scope.todos) {
                    todos = $scope.todos;
                    todos.forEach(function(todo) {
                        var date = new Date(todo.date);                        
                        if (todo.done) {
                            alltimeClosed++;
                            if (date > dateFilter(7) && date <= dateFilter(0)) {
                                thisWeekClosed++;
                            } else if (date <= dateFilter(7) && date > dateFilter(14)){
                                lastWeekClosed++;
                            } else if (date <= dateFilter(14) && date > dateFilter(30)){
                                thisMonthClosed++;
                            }
                        } else {
                            alltimeOpen++;
                            if (date > dateFilter(7) && date <= dateFilter(0)) {
                                thisWeekOpen++;
                            } else if (date <= dateFilter(7) && date > dateFilter(14)){
                                lastWeekOpen++;                                
                            } else if (date <= dateFilter(14) && date > dateFilter(30)){
                                thisMonthOpen++;
                            }
                        
                        }
                    })

                    var data = google.visualization.arrayToDataTable([
                    	        	['Time period', 'Open', 'Closed'],
                    	        	['All Time', alltimeOpen, alltimeClosed],
                    	        	['This Week', thisWeekOpen, thisWeekClosed],
                    	        	['Last Week', lastWeekOpen, lastWeekClosed],
                    	        	['This Month', thisMonthOpen, thisMonthClosed]
                    	    	]);
    
                	var options = {
                		title: 'Tasks Completion',
                	};

                	var chart = {};
            
        			var chart = new google.visualization.ColumnChart(elm[0]);
                    chart.draw(data, options);    
                }           
            }, true);
		}
	}
})
.filter('reverse', function() {
    return function(items) {
      return items.slice().reverse();
    };
})
// run x-editable
.run(function(editableOptions) {
    editableOptions.theme = 'bs3'; // bootstrap3 theme. Can be also 'bs2', 'default'
});