import MultiPartProgressBarExample from '@/components/common/MultiPartProgressBarExample';

export default function TestProgressPage() {
  return (
    <div className="container mx-auto max-w-3xl py-12 px-4">
      <h1 className="text-2xl font-bold mb-6">Multi-Part Progress Bar Examples</h1>
      <p className="mb-8 text-gray-600">
        This page demonstrates the new multi-part progress bar component with various configurations.
        Hover over segments to see tooltips, and notice different styling options available.
      </p>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <MultiPartProgressBarExample />
      </div>
      
      <div className="mt-12 bg-gray-50 p-6 rounded-lg border border-gray-200">
        <h2 className="text-xl font-semibold mb-4">Component Features</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>Multiple color-coded segments to represent different categories or statuses</li>
          <li>Custom tooltip for each segment on hover</li>
          <li>Optional labels and percentages displayed below each segment</li>
          <li>Animation support for specific segments</li>
          <li>Status indicators (completed, in-progress, pending) for visual feedback</li>
          <li>Adjustable height, rounded corners, and other styling options</li>
          <li>Support for showing total progress information</li>
        </ul>
      </div>
    </div>
  );
} 