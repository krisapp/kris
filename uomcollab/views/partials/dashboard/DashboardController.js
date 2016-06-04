angular.module('uomcollab').controller('DashboardController',[
	'$scope',
	'$state',
	'$http',
	'APIRestangular',
	'config',
	'$rootScope',
	'mySocket',
	'$interval',
	function($scope,$state,$http,APIRestangular,config,$rootScope,mySocket,$interval){
		
		$scope.config = config;
		$rootScope.notifications = [];
		$rootScope.messages = [];
		$rootScope.chatsAll = [];
		$rootScope.events = [];
		$scope.participants = {};
		
		var socket = mySocket.connect("http://localhost:3000");
		
		mySocket.emit("userConnected",config);
		
		mySocket.on('participantsList',function(participants){
			$scope.participants = participants;
		});

		socket.on('disconnect',function(){
			mySocket.emit("userDisconnected",config);
		});

		$rootScope.isState = function(state){
			return (state==$state.current.name)?true:false;
		}
		

		$rootScope.getAllData = function(){
			APIRestangular.all('notifications').getList({"to_id":config.userid}).then(function(response){
				$rootScope.notifications = [];
				for(var i=0;i<response.length;i++){
					if(response[i].accept == false){
						$rootScope.notifications.push(response[i]);
					}
				}
				console.log($rootScope.notifications);
			});

			APIRestangular.all('emails').getList({"owner_username":$scope.config.username,"to_id":config.userid,"draft":"false","trash":"false"}).then(function(response){
				$rootScope.messages = [];
				for(var i=0;i<response.length;i++){
					if(response[i].read == false){
						$rootScope.messages.push(response[i]);
					}
				}
			});

			APIRestangular.all('chatnotifications').getList({"to_username":config.username,"seen":"false"}).then(function(response){
				$rootScope.chatsAll = [];
				for(var i=0;i<response.length;i++){
					$rootScope.chatsAll.push(response[i]);
					//$("#btn_new_"+response[i].from_username).css("display","inline");
				}
				console.log($rootScope.chatsAll);
			});

			APIRestangular.all('events').getList({"username":config.username}).then(function(response){
				console.log(response);
				$rootScope.events = [];
				for(var i=0;i<response.length;i++){
					console.log(response[i]);
					var date = new Date(response[i].start);
					var day = date.getDay();
					var month = date.getMonth();
					var year = date.getFullYear();
					var todaydate = new Date();
					var today = todaydate.getDay();
					var thismonth = todaydate.getMonth();
					var thisyear = todaydate.getFullYear();
					if( day==today && month==thismonth && year==thisyear ){
						$rootScope.events.push(response[i]);
						console.log('todays date: '+Date.now())
					}
				}
			});
			APIRestangular.all('project_users').getList({"user_id":config.userid}).then(function(response){
			console.log(response);
			var idlist= [];
			$rootScope.projects = [];
			response.forEach(function(project_user) { idlist.push((project_user.project_id) ); } );
	
								console.log(idlist)
		
		APIRestangular.all('projects').getList().then(function (p_response){
			
			
			  console.log('Projects resp against _id');
				console.log(p_response);
				p_response.forEach(function(project) { 
					console.log(project._id);
					if(inArray(project._id,idlist)){
						$rootScope.projects.push(project); 
					}
					
					
				} 
				);
			}, function (err){
			  console.warn('oh no!', err);
		}
		);
	
		
				console.log('Projects :');
			console.log($scope.projects);
		});
		}
		// INitially get all the data
		$rootScope.getAllData();
		//Watch for updates every 10 secs
		$interval($rootScope.getAllData,10000);

		$rootScope.acceptInvitation = function(invitation){
   
   invitation.accept=true;
   invitation.acknowledge = true;
   if(invitation.type=='event'){
    APIRestangular.all('events').get(invitation.event_id).then(function(response){
    console.log(response);
    var event_details = response;
    event_details.username = config.username;
    event_details.userid = config.userid;
    event_details.isOwner = false;
    APIRestangular.all('events').post(event_details).then(function(response){
     console.log(response);
    });
   });
    
   }
   if(invitation.type=='project'){
    var project_user = {};
    project_user.project_id = invitation.event_id;
    project_user.user_id = config.userid;
   
    APIRestangular.all('project_users').post(project_user).then(function(response){
     console.log(response);
    });
   
    
   }
   
   invitation.put().then(function(response){
    
    $scope.getAllData();
   });
  }
		$rootScope.rejectInvitation = function(invitation){
			
			invitation.acknowledge = true;
			invitation.rejected = true;
			invitation.accept = true;
			
			invitation.put().then(function(response){
				$scope.getAllData();
			})
			console.log(invitation);
			var notification = {};
			notification.rejected = true;
			notification.to_id = invitation.from_id;
			notification.to_name = invitation.from_name;
			notification.from_id = config.userid;
			notification.from_name = config.username;
			notification.type = "event";
			notification.message ="rejected";
			notification.event_id = invitation.event_id;
			notification.event_start = invitation.event_start;
			notification.event_title = invitation.event_title;
			notification.time= Date.now();
			notification.acknowledge = false;
			notification.accept = false;
			APIRestangular.all('events').get(notification.event_id).then(function(response){
				console.log(response);
				for(var i=0;i<response.members.length;i++){
					if(config.userid == response.members[i].id){
						console.log(i);
						response.members.splice(i,1);
						console.log(response);
						response.put().then(function(resp){
							console.log(resp);
						})
					}
				}
			});

			APIRestangular.all('notifications').post(notification).then(function(response){
				console.log(response);
				$rootScope.getAllData();
			})

			
			
		}
		$rootScope.readNotification = function(notification){
			notification.acknowledge = true;
			notification.accept = true;
			notification.put().then(function(response){
				console.log(response);
			})
		}

		$rootScope.updateUserNotification = function(){
			console.log($rootScope.chatsAll);
			for(var i=0;i<$rootScope.chatsAll.length;i++){
				console.log($('#btn_new_'+$rootScope.chatsAll[i].from_username));
				$('#btn_new_'+$rootScope.chatsAll[i].from_username).css('display','inline');
				$rootScope.$apply();
			}	
		}
	}
]);