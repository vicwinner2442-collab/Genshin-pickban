import ProfilePage from "../../components/ProfilePage";

export default async function SharedProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProfilePage profileId={id} />;
}
