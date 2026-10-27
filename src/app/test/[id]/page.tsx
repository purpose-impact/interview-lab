import TestRunner from './TestRunner';

export const dynamic = 'force-dynamic';

export default function TestPage({ params }: { params: { id: string } }) {
  return <TestRunner id={params.id} />;
}
