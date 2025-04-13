// You're right about needing to use useParams for client components
"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { Blog } from "@/payload-types";

function ClientBlog() {
	// Get the id from the URL using useParams
	const params = useParams();
	const id = params.id as string; // Cast to string since useParams returns string | string[]

	const [blog, setBlog] = useState<Blog | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchBlog = async () => {
			try {
				const res = await fetch(`/api/blogs/${id}`);
				// Handle rate limiting - check if we got a 429
				if (res.status === 429) {
					console.error("Rate limit exceeded");
					return;
				}
				// Only try to parse JSON if the request was successful
				if (res.ok) {
					const data = await res.json();
					setBlog(data);
				}
			} catch (err) {
				console.error("Error fetching blog:", err);
			} finally {
				setLoading(false);
			}
		};

		fetchBlog();
	}, [id]);

	if (loading) return <p>Loading...</p>;
	if (!blog) return <p>Blog not found.</p>;

	return (
		<main className="max-w-4xl mx-auto p-6">
			<h1 className="text-3xl font-bold mb-6">{blog.title}</h1>
			<p>{blog.createdAt}</p>
		</main>
	);
}

// Export as default component
export default function BlogPage() {
	return <ClientBlog />;
}
