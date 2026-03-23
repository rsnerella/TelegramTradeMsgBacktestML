import SignalsTable from '../components/SignalsTable';
import { signals } from '../data/mockData';

export default function Signals() {
  return (
    <div className="p-6">
      <SignalsTable signals={signals} />
    </div>
  );
}
