self.addEventListener('message', function (event) {
	if (event.data.action === 'start') {
		startTimer(event.data.timer);
	} else if (event.data.action === 'stop') {
		clearInterval(self.timerInterval);
	} else if (event.data.action === 'addTime') {
		addTime(event.data.additionalTime);
	}
});
function startTimer(timer) {
	self.currentTimer = timer;
	self.timerInterval = setInterval(function () {
		if (self.currentTimer > 0) {
			self.currentTimer--;
			self.postMessage({ message: 'update', timer: self.currentTimer });
			if (self.currentTimer === 60) {
				self.postMessage({ message: 'One minute left' });
			}
		} else {
			clearInterval(self.timerInterval);
			self.postMessage({ message: 'Time is up' });
		}
	}, 1000);
}
function addTime(additionalTime) {
	self.currentTimer += additionalTime;
	self.postMessage({ message: 'update', timer: self.currentTimer });
}
