import { completeOnboarding } from "./actions";

export default function Onboarding() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-md mx-auto bg-white p-8 rounded-xl shadow-md">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Complete Your Profile</h2>
        
        <form action={completeOnboarding} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Business Name</label>
            <input required name="businessName" type="text" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500" placeholder="Acme Corp" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Category</label>
            <select name="businessCategory" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500">
              <option>IT Services</option>
              <option>Marketing</option>
              <option>Finance</option>
              <option>Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Contact Number</label>
            <input required name="contactNumber" type="tel" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500" placeholder="+1 (555) 000-0000" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Business Description</label>
            <textarea required name="description" rows={4} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500" placeholder="Briefly describe what your business does..." />
          </div>

          <button type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none">
            Save & Continue
          </button>
        </form>
      </div>
    </div>
  );
}
