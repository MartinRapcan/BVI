// This is a simple wrapper to avoid type issues

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Blog } from "@/payload-types";

// src/app/(frontend)/blogs/page.tsx
export default function BlogsPageWrapper() {
	return <BlogsPage />;
}

function BlogsPage() {
	const [blogs, setBlogs] = useState<Blog[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetchBlogs = async () => {
			try {
				const res = await fetch("/api/blogs?pagination=false");
				if (!res.ok) {
					throw new Error(`Failed to fetch blogs: ${res.statusText}`);
				}
				const data = await res.json();
				setBlogs(data.docs); // assuming your API returns { docs: Blog[] }
			} catch (err: unknown) {
				console.error("Error fetching blogs:", err);
				if (err instanceof Error) {
					setError(err.message);
				} else {
					setError("An unknown error occurred");
				}
			} finally {
				setLoading(false);
			}
		};

		fetchBlogs();
	}, []);

	if (loading) return <p className="p-6">Loading blogs...</p>;
	if (error) return <p className="p-6 text-red-500">Error: {error}</p>;

	return (
		<main className="max-w-4xl mx-auto p-6">
			<h1 className="text-3xl font-bold mb-6">Blog Posts</h1>
			<ul>
				{blogs.map((blog) => (
					<li key={blog.id} className="mb-4">
						<Link
							href={`/blogs/${blog.id}`}
							className="text-blue-500 hover:underline"
						>
							{blog.title} - {blog.id}
						</Link>
						{blog.publishedAt && (
							<p className="text-gray-500 text-sm">
								{new Date(blog.publishedAt).toDateString()}
							</p>
						)}
					</li>
				))}
			</ul>
		</main>
	);
}
