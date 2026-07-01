import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { collegeService, counsellingService, getUserId } from "../services/api";
import { cache } from "../utils/cache";
import { useAuth } from "../contexts/AuthContext";
import type { Branch } from "../types";
import { LoadingIndicator } from "../components/application/loading-indicator/loading-indicator";

const CollegeDetailPage = () => {
  const { publicId } = useParams<{ publicId: string }>();
  const { user } = useAuth();
  const [college, setCollege] = useState<any>(null);
  const [choiceKeys, setChoiceKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (publicId) {
      loadCollege();
    }
    if (user?.type_of_student === "counselling") {
      loadChoices();
    }
  }, [publicId]);

  const loadCollege = async () => {
    try {
      const data = await collegeService.detail(publicId!);
      setCollege(data);
    } catch (err) {
      console.error("Error loading college:", err);
    }
  };

  const loadChoices = async () => {
    try {
      const list = await counsellingService.choices.list();
      setChoiceKeys(new Set(list.map((item) => item.unique_key_data?.public_id || '').filter(Boolean)));
    } catch (err) {
      console.error("Error loading choices:", err);
      setChoiceKeys(new Set());
    }
  };

  const addToChoices = async (publicId: string) => {
    try {
      await counsellingService.choices.create(publicId);
      const userId = getUserId()
      if (userId) {
        cache.remove(`choice_list_${userId}`)
      }
      setChoiceKeys((prev) => new Set(prev).add(publicId));
      alert("Added to your choices!");
    } catch (err: any) {
      alert(err.response?.data?.error || "Error adding choice");
    }
  };

  if (!college)
  return (
    <div className="flex items-center justify-center min-h-[300px] text-slate-600 dark:text-gray-300">
      <LoadingIndicator
        type="dot-circle"
        size="md"
        label="Loading College Details..."
      />
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 mb-6 border border-slate-300 dark:border-slate-700">
        <h1 className="text-3xl font-bold mb-2 text-slate-800 dark:text-gray-100">
          {college.college_name}
        </h1>
        <p className="text-slate-600 dark:text-gray-400">
          Code: {college.college_code}
        </p>
        <p className="text-slate-600 dark:text-gray-400">
          Location: {college.location}
        </p>
        <p className="text-slate-600 dark:text-gray-400 flex items-center gap-2">
          Explore more about this college on the Official Website.
          {college.college_link && (
            <a
              href={college.college_link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-600 dark:text-slate-400 hover:text-blue-600 transition"
              aria-label="Open official college website"
            >
              <i className="fi fi-br-up-right-from-square"></i>
            </a>
          )}
        </p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 border border-slate-300 dark:border-slate-700">
        <h2 className="text-xl font-semibold mb-4 text-slate-800 dark:text-gray-100">
          Branches
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-gray-400 uppercase">
                  Branch
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-gray-400 uppercase">
                  Cluster
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-gray-400 uppercase">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
              {college.branches?.map((branch: Branch) => (
                <tr
                  key={branch.public_id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  <td className="px-4 py-3 text-slate-900 dark:text-gray-100">
                    <Link
                      to={`/branches/${branch.public_id}`}
                      className="text-blue-600 dark:text-sky-400 hover:underline"
                    >
                      {branch.branch_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-900 dark:text-gray-100">
                    {branch.cluster.cluster_name}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {user?.type_of_student === "counselling" &&
                        (choiceKeys.has(branch.public_id) ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 whitespace-nowrap">
                            Added
                          </span>
                        ) : (
                          <button
                            onClick={() => addToChoices(branch.public_id)}
                            className="text-blue-600 dark:text-sky-400 hover:text-blue-800 dark:hover:text-sky-300 text-sm whitespace-nowrap"
                          >
                            Add to Choices
                          </button>
                        ))}
                      <Link
                        to={`/branches/${branch.public_id}`}
                        className="text-sm text-slate-700 dark:text-gray-300 hover:underline whitespace-nowrap"
                      >
                        View Details
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CollegeDetailPage;
