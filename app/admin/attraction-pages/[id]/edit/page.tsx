import AttractionPageForm from '@/components/admin/AttractionPageForm';

interface EditAttractionPageProps {
  params: { id: string };
}

export default function EditAttractionPage({ params }: EditAttractionPageProps) {
  return <AttractionPageForm pageId={params.id} />;
}