
type EventDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EventDetailPage({
  params,
}: EventDetailPageProps) {
  const { id } = await params;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0B1020",
        color: "#FFFFFF",
        padding: "40px 7%",
      }}
    >
      <h1>EVENT DETAILS</h1>
      <p>Event ID: {id}</p>
    </main>
  );
}
