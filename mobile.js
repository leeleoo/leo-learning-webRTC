var MEDIASOURCE = {
	video:[],
	audio:[]
}

var docElement = document.documentElement;

function InitializeRTC(){

	if (hasUserMedia()) {

		navigator.mediaDevices.enumerateDevices().then(function(sourceList){
			sourceList.map(function( item, index ){
				switch ( item.kind ) {
					case 'videoinput':
						MEDIASOURCE.video.push( item.deviceId )
						break;
					case 'audioinput':
						MEDIASOURCE.audio.push( item.deviceId )
						break;
				}
			})
			setupVideo( MEDIASOURCE.video[0], MEDIASOURCE.audio[0] );
		})

	} else {

	  alert("Sorry, your browser does not support WebRTC.");

	}

}



var CONSTRAINTS ={
	video:{
		mandatory:{
			minAspectRatio: 1.777,
			maxAspectRatio: 1.778,
		}
	},
	audio:false
}


function setupVideo( videoSource, audioSource ){

	if( /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ){

		var minWidth = screen.width;

		var minHeight = screen.height;

		var minAspectRatio = minWidth / minHeight;

		var maxAspectRatio = minAspectRatio + 0.01;

		CONSTRAINTS ={
			video:{
				mandatory:{
					minAspectRatio: minAspectRatio,
					maxAspectRatio: maxAspectRatio,
					minWidth: minWidth,
					minHeight: minHeight,

				},
				optional:[
					{
						sourceId: videoSource
					}
				]
			},
			audio:false
		}

		$('#theirs').style.width  = minWidth + 'px';
		
		$('#theirs').style.height = minHeight + 'px';
		
		$('#yours').style.width   = '40%';

	}else{



	}

	startConnection();

}

function $(args){

	return document.querySelector(args);

}
