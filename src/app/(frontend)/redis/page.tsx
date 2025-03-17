// app/admin/redis/page.tsx
"use client";

import { useState, useEffect } from "react";

interface RedisMetrics {
	status: string;
	timestamp: string;
	metrics: {
		hits: number;
		misses: number;
		hitRate: number;
		keyCount: number;
		memory: {
			used: string;
			peak: string;
		};
		uptime: {
			seconds: number;
			days: number;
		};
		rateLimiting: {
			activeIps: number;
			blockedIps: number;
		};
	};
}

export default function SimpleRedisMetricsPage() {
	const [metrics, setMetrics] = useState<RedisMetrics | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchMetrics = async () => {
		try {
			setLoading(true);
			const response = await fetch("/api/metrics/redis");

			if (!response.ok) {
				throw new Error(`Failed to fetch metrics: ${response.statusText}`);
			}

			const data = await response.json();
			setMetrics(data);
			setError(null);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to fetch metrics");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchMetrics();

		// Auto-refresh every 10 seconds
		const interval = setInterval(fetchMetrics, 10000);
		return () => clearInterval(interval);
	}, []);

	return (
		<div className="p-6 max-w-2xl mx-auto">
			<div className="flex flex-col gap-4">
				<h1 className="text-2xl font-bold">Redis Metrics</h1>

				{loading && !metrics && (
					<p className="text-gray-500">Loading metrics...</p>
				)}

				{error && <p className="text-red-500">Error: {error}</p>}

				{metrics && (
					<>
						<p className="text-sm text-gray-500">
							Last updated: {new Date(metrics.timestamp).toLocaleString()}
						</p>

						<p className="font-medium">
							<span className="font-bold">Cache Hit Rate:</span>{" "}
							{metrics.metrics.hitRate}%
						</p>

						<p>
							<span className="font-bold">Cache Hits:</span>{" "}
							{metrics.metrics.hits.toLocaleString()}
						</p>

						<p>
							<span className="font-bold">Cache Misses:</span>{" "}
							{metrics.metrics.misses.toLocaleString()}
						</p>

						<p>
							<span className="font-bold">Total Keys in Redis:</span>{" "}
							{metrics.metrics.keyCount.toLocaleString()}
						</p>

						<p>
							<span className="font-bold">Memory Used:</span>{" "}
							{metrics.metrics.memory.used}
						</p>

						<p>
							<span className="font-bold">Memory Peak:</span>{" "}
							{metrics.metrics.memory.peak}
						</p>

						<p>
							<span className="font-bold">Server Uptime:</span>{" "}
							{metrics.metrics.uptime.days} days
						</p>

						<p>
							<span className="font-bold">Active IPs:</span>{" "}
							{metrics.metrics.rateLimiting.activeIps}
						</p>

						<p>
							<span className="font-bold">Blocked IPs:</span>{" "}
							{metrics.metrics.rateLimiting.blockedIps}
						</p>

						<button
							onClick={fetchMetrics}
							className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded self-start"
						>
							Refresh Metrics
						</button>
					</>
				)}
			</div>
		</div>
	);
}
