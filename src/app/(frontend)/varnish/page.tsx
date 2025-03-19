"use client";
import React, { useState, useEffect } from "react";
import { Server, Layers, CheckCircle, XCircle, RefreshCw } from "lucide-react";

const VarnishStatusViewer = () => {
	const [status, setStatus] = useState({
		running: false,
		cacheHits: 0,
		cacheMisses: 0,
		hitRatio: 0,
	});
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		// Simulated data fetch - replace with actual API call in real implementation
		const fetchVarnishStatus = async () => {
			try {
				// Placeholder for actual Varnish status API
				setStatus({
					running: true,
					cacheHits: 1500,
					cacheMisses: 500,
					hitRatio: 75,
				});
				setLoading(false);
			} catch (error) {
				setStatus({
					running: false,
					cacheHits: 0,
					cacheMisses: 0,
					hitRatio: 0,
				});
				setLoading(false);
			}
		};

		fetchVarnishStatus();
		const interval = setInterval(fetchVarnishStatus, 30000);
		return () => clearInterval(interval);
	}, []);

	return (
		<div className="bg-white shadow-md rounded-lg p-6 max-w-md mx-auto">
			<div className="flex items-center mb-4">
				<Server className="mr-3 text-blue-500" />
				<h2 className="text-xl font-bold">Varnish Cache Status</h2>
			</div>

			{loading ? (
				<div className="flex items-center justify-center text-gray-500">
					<RefreshCw className="animate-spin mr-2" />
					Loading Varnish Status...
				</div>
			) : (
				<>
					<div className="flex items-center mb-2">
						{status.running ? (
							<CheckCircle className="text-green-500 mr-2" />
						) : (
							<XCircle className="text-red-500 mr-2" />
						)}
						<span>Status: {status.running ? "Running" : "Not Running"}</span>
					</div>

					<div className="grid grid-cols-2 gap-4 mt-4">
						<div className="bg-blue-50 p-3 rounded">
							<Layers className="text-blue-500 mb-2" />
							<div className="font-bold">{status.cacheHits}</div>
							<div className="text-sm text-gray-600">Cache Hits</div>
						</div>

						<div className="bg-red-50 p-3 rounded">
							<Layers className="text-red-500 mb-2" />
							<div className="font-bold">{status.cacheMisses}</div>
							<div className="text-sm text-gray-600">Cache Misses</div>
						</div>
					</div>

					<div className="mt-4">
						<div className="bg-gray-100 rounded-full h-4 w-full">
							<div
								className="bg-blue-500 rounded-full h-4"
								style={{ width: `${status.hitRatio}%` }}
							/>
						</div>
						<div className="text-center mt-2 text-sm">
							Cache Hit Ratio: {status.hitRatio}%
						</div>
					</div>
				</>
			)}
		</div>
	);
};

export default VarnishStatusViewer;
