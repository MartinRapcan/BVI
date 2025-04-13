"use client";

import { useState } from "react";

export default function DDoSTestPage() {
	return <DDoSTest />;
}

function DDoSTest() {
	const [targetUrl, setTargetUrl] = useState("/api/blogs");
	const [requestsCount, setRequestsCount] = useState(50);
	const [concurrency, setConcurrency] = useState(10);
	const [interval, setInterval] = useState(100);
	const [results, setResults] = useState<{
		successful: number;
		failed: number;
		totalTime: number;
		avgResponseTime: number;
	} | null>(null);
	const [isRunning, setIsRunning] = useState(false);
	const [logs, setLogs] = useState<string[]>([]);

	const addLog = (message: string) => {
		setLogs((prev) => [
			...prev,
			`[${new Date().toLocaleTimeString()}] ${message}`,
		]);
	};

	const runTest = async () => {
		if (isRunning) return;

		setIsRunning(true);
		setResults(null);
		setLogs([]);

		addLog(
			`Starting DDoS test with ${requestsCount} simultaneous requests to ${targetUrl}`,
		);

		let successful = 0;
		let failed = 0;
		const responseTimes: number[] = [];

		const startTime = performance.now();

		// Create all requests at once
		const promises = Array.from({ length: requestsCount }, async (_, i) => {
			const requestStart = performance.now();
			try {
				const response = await fetch(targetUrl, {
					// Add cache: 'no-store' to prevent browser caching
					cache: "no-store",
					headers: {
						// Add a unique parameter to prevent caching
						"Cache-Control": "no-cache, no-store, must-revalidate",
						Pragma: "no-cache",
						Expires: "0",
					},
				});

				const requestEnd = performance.now();
				const responseTime = requestEnd - requestStart;
				responseTimes.push(responseTime);

				if (response.ok) {
					successful++;
					addLog(`Request ${i + 1} successful (${responseTime.toFixed(2)}ms)`);
				} else {
					failed++;
					addLog(
						`Request ${i + 1} failed with status ${response.status} (${responseTime.toFixed(2)}ms)`,
					);
				}
			} catch (error) {
				failed++;
				const requestEnd = performance.now();
				const responseTime = requestEnd - requestStart;
				addLog(
					`Request ${i + 1} error: ${error} (${responseTime.toFixed(2)}ms)`,
				);
			}
		});

		// Wait for all requests to complete
		await Promise.all(promises);

		const endTime = performance.now();
		const totalTime = endTime - startTime;
		const avgResponseTime =
			responseTimes.length > 0
				? responseTimes.reduce((sum, time) => sum + time, 0) /
					responseTimes.length
				: 0;

		setResults({
			successful,
			failed,
			totalTime,
			avgResponseTime,
		});

		addLog(`Test completed in ${totalTime.toFixed(2)}ms`);
		setIsRunning(false);
	};

	return (
		<div className="max-w-4xl mx-auto p-6">
			<h1 className="text-2xl font-bold mb-6">DDoS Test Tool</h1>
			<p className="text-red-500 mb-4">
				⚠️ Warning: Use only on applications you have permission to test!
			</p>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				<div className="space-y-4">
					<div>
						<label className="block text-sm font-medium mb-1">
							Target URL:
						</label>
						<input
							type="text"
							value={targetUrl}
							onChange={(e) => setTargetUrl(e.target.value)}
							className="w-full p-2 border rounded"
							disabled={isRunning}
						/>
						<p className="text-xs text-gray-500 mt-1">
							Example: /api/blogs?pagination=false
						</p>
					</div>

					<div>
						<label className="block text-sm font-medium mb-1">
							Number of Simultaneous Requests:
						</label>
						<input
							type="number"
							value={requestsCount}
							onChange={(e) => setRequestsCount(parseInt(e.target.value))}
							className="w-full p-2 border rounded"
							min="1"
							max="1000"
							disabled={isRunning}
						/>
						<p className="text-xs text-gray-500 mt-1">
							All requests will be sent at the same time
						</p>
					</div>

					<div className="bg-yellow-50 p-3 rounded border border-yellow-200">
						<h3 className="font-medium mb-1">Test Options:</h3>
						<ul className="text-sm list-disc pl-5 space-y-1">
							<li>Try with 10-50 requests first to test basic functionality</li>
							<li>Increase to 100-500 requests to simulate a DDoS attack</li>
							<li>Watch for 429 responses when rate limiting kicks in</li>
						</ul>
					</div>

					<button
						onClick={runTest}
						disabled={isRunning}
						className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-blue-300 hover:bg-blue-600"
					>
						{isRunning ? "Running Test..." : "Launch DDoS Test"}
					</button>
				</div>

				<div>
					<h2 className="text-lg font-semibold mb-2">Results</h2>

					{results ? (
						<div className="bg-gray-100 p-4 rounded mb-4">
							<div className="grid grid-cols-2 gap-2">
								<div>Successful Requests:</div>
								<div>{results.successful}</div>

								<div>Failed Requests:</div>
								<div>{results.failed}</div>

								<div>Total Time:</div>
								<div>{results.totalTime.toFixed(2)} ms</div>

								<div>Average Response Time:</div>
								<div>{results.avgResponseTime.toFixed(2)} ms</div>
							</div>
						</div>
					) : null}

					<h2 className="text-lg font-semibold mb-2">Logs</h2>
					<div className="bg-gray-900 text-green-400 p-4 rounded h-64 overflow-y-auto font-mono text-sm">
						{logs.length > 0 ? (
							logs.map((log, i) => <div key={i}>{log}</div>)
						) : (
							<div className="text-gray-500">No logs yet.</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
