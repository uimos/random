type WorkerActionMessage = {
	action: 'start' | 'stop' | 'addTime';
	timer?: number;
	additionalTime?: number;
};

const ctx = self as unknown as Worker;
let currentTimer = 0;
let timerInterval: ReturnType<typeof setInterval> | undefined;

ctx.addEventListener('message', (event: MessageEvent<WorkerActionMessage>) => {
	if (event.data.action === 'start') {
		startTimer(event.data.timer ?? 0);
	} else if (event.data.action === 'stop') {
		if (timerInterval) clearInterval(timerInterval);
	} else if (event.data.action === 'addTime') {
		addTime(event.data.additionalTime ?? 0);
	}
});

function startTimer(timer: number) {
	currentTimer = timer;
	if (timerInterval) clearInterval(timerInterval);
	timerInterval = setInterval(() => {
		if (currentTimer > 0) {
			currentTimer--;
			ctx.postMessage({ message: 'update', timer: currentTimer });
			if (currentTimer === 60) {
				ctx.postMessage({ message: 'One minute left' });
			}
		} else {
			if (timerInterval) clearInterval(timerInterval);
			ctx.postMessage({ message: 'Time is up' });
		}
	}, 1000);
}

function addTime(additionalTime: number) {
	currentTimer += additionalTime;
	ctx.postMessage({ message: 'update', timer: currentTimer });
}
