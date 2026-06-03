import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { reviewService } from "../services/api";
import StarRating from "../components/StarRating";
import type { Review } from "../types";
import MeetingRequestForm from "../components/MeetingRequestForm";

const ratingFields = [
  { key: "teaching", label: "Teaching Quality" },
  { key: "courses", label: "Course Curriculum" },
  { key: "library", label: "Library Facilities" },
  { key: "research", label: "Research Opportunities" },
  { key: "internship", label: "Internship Support" },
  { key: "infrastructure", label: "Infrastructure" },
  { key: "administration", label: "Administration" },
  { key: "extracurricular", label: "Extracurricular Activities" },
  { key: "safety", label: "Safety & Security" },
  { key: "placement", label: "Placement Support" },
] as const;

const reviewFormInitial = {
  unique_key: "",
  teaching_rating: 5,
  teaching_review: "",
  courses_rating: 5,
  courses_review: "",
  library_rating: 5,
  library_review: "",
  research_rating: 5,
  research_review: "",
  internship_rating: 5,
  internship_review: "",
  infrastructure_rating: 5,
  infrastructure_review: "",
  administration_rating: 5,
  administration_review: "",
  extracurricular_rating: 5,
  extracurricular_review: "",
  safety_rating: 5,
  safety_review: "",
  placement_rating: 5,
  placement_review: "",
  preferred_day: "",
  preferred_time: "",
  start_time: undefined as number | undefined,
  end_time: undefined as number | undefined,
};

const daysOfWeek = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const StudyingDashboard = () => {
  const { user, loading: authLoading } = useAuth();

  const resolveUniqueKey = () => {
    if (!user?.unique_key) return "";
    if (typeof user.unique_key === "string") return user.unique_key;
    return user.unique_key.unique_key || "";
  };

  const resolvedUniqueKey = resolveUniqueKey();

  const [showReviewForm, setShowReviewForm] = useState(false);
  const [branchName, setBranchName] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [existingReview, setExistingReview] = useState<Review | null>(null);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reviewFormData, setReviewFormData] = useState(reviewFormInitial);

  const selectedDays = reviewFormData.preferred_day
    ? reviewFormData.preferred_day.split(", ").map((d) => d.trim())
    : [];

  const formatTime = (hour: number) => {
    const period = hour >= 12 ? "PM" : "AM";
    const h = hour % 12 === 0 ? 12 : hour % 12;
    return `${h}${period}`;
  };

  const START_HOURS = Array.from({ length: 22 }, (_, i) => i); // 12AM(0) → 9PM(21)

  useEffect(() => {
    // Only load data if user is authenticated and not loading
    const loadData = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);

        // load branch display name
        const branchData = user?.unique_key_data ||
          (user?.unique_key && typeof user.unique_key !== 'string' ? user.unique_key : null);

        if (branchData) {
          setBranchName(branchData.branch_name || "");
          setCollegeName(branchData.college?.college_name || "");
        } else if (user?.unique_key) {
          setBranchName("N/A");
          setCollegeName("N/A");
        } else {
          setBranchName("");
          setCollegeName("");
        }



        // load existing review
        try {
          if (resolvedUniqueKey) {
            const review = await reviewService.myReview(resolvedUniqueKey);
            if (review && review.review_id) {
              setExistingReview(review);
              setReviewFormData({
                unique_key: resolvedUniqueKey,
                teaching_rating: review.teaching_rating || 5,
                teaching_review: review.teaching_review || "",
                courses_rating: review.courses_rating || 5,
                courses_review: review.courses_review || "",
                library_rating: review.library_rating || 5,
                library_review: review.library_review || "",
                research_rating: review.research_rating || 5,
                research_review: review.research_review || "",
                internship_rating: review.internship_rating || 5,
                internship_review: review.internship_review || "",
                infrastructure_rating: review.infrastructure_rating || 5,
                infrastructure_review: review.infrastructure_review || "",
                administration_rating: review.administration_rating || 5,
                administration_review: review.administration_review || "",
                extracurricular_rating: review.extracurricular_rating || 5,
                extracurricular_review: review.extracurricular_review || "",
                safety_rating: review.safety_rating || 5,
                safety_review: review.safety_review || "",
                placement_rating: review.placement_rating || 5,
                placement_review: review.placement_review || "",
                preferred_day: review.preferred_day || "",
                preferred_time: review.preferred_time || "",
                start_time: undefined,
                end_time: undefined,
              });
            } else {
              setExistingReview(null);
              setReviewFormData({ ...reviewFormInitial, unique_key: resolvedUniqueKey });
            }
          } else {
            setExistingReview(null);
          }
        } catch (err) {
          console.error("Error loading existing review:", err);
          setExistingReview(null);
        }
      } catch (err) {
        console.error("Error loading dashboard data:", err);
        setLoadError("Failed to load dashboard data. Please refresh the page.");
      } finally {
        setIsLoading(false);
      }
    };

    if (!authLoading && user) {
      loadData();
    }
  }, [user, authLoading]);


  const isFormValid = ratingFields.every(field => {
    const text = (reviewFormData[`${field.key}_review` as keyof typeof reviewFormData] as string) || '';
    return text.trim().length >= 75 && text.trim().length <= 1000;
  });

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingReview) return; // Prevent multiple submissions
    if (!resolvedUniqueKey || !user?.unique_key_data) {
      alert(
        "Please set your branch in your profile before submitting a review."
      );
      return;
    }

    // Double check constraints on submit
    for (const field of ratingFields) {
      const fieldName = `${field.key}_review`;
      const val = (reviewFormData[fieldName as keyof typeof reviewFormData] as string || '').trim();
      if (val.length < 75) {
        alert(`Review for ${field.label} must contain at least 75 characters.`);
        return;
      }
      if (val.length > 1000) {
        alert(`Review for ${field.label} cannot exceed 1000 characters.`);
        return;
      }
    }

    setSubmittingReview(true);
    
    try {
      // Proceed with submission, always sending the authenticated branch ID.
      await reviewService.create({ ...reviewFormData, unique_key: resolvedUniqueKey });
      alert(
        existingReview
          ? "Review updated successfully!"
          : "Review submitted successfully!"
      );
      // Reload existing review
      if (resolvedUniqueKey) {
        const review = await reviewService.myReview(resolvedUniqueKey);
        setExistingReview(review);
      }
      setShowReviewForm(false); // collapse the form after submit
    } catch (err: any) {
      alert(err.response?.data?.error || err.response?.data?.message || "Error submitting review");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!resolvedUniqueKey) return;

    if (
      !confirm(
        "Are you sure you want to delete your review? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      await reviewService.delete(resolvedUniqueKey);
      setExistingReview(null);
      setReviewFormData({ ...reviewFormInitial, unique_key: resolvedUniqueKey });
      setShowReviewForm(false);
      alert("Review deleted successfully!");
    } catch (err: any) {
      alert(err.response?.data?.error || "Error deleting review");
    }
  };



  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Loading state */}
      {isLoading && (
        <div className="flex justify-center items-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-gray-400">Loading your dashboard...</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {loadError && (
        <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded mb-4">
          <p className="font-semibold">Error</p>
          <p>{loadError}</p>
        </div>
      )}

      {/* Content - only show when not loading */}
      {!isLoading && (
        <>
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-800 dark:text-gray-100">
              Studying Dashboard
            </h1>
            <p className="mt-2 text-slate-600 dark:text-gray-400">
              <span className="font-bold">Welcome,</span> {user?.name || "User"}
            </p>
            {user?.unique_key && (
              <>
                <p className="text-sm text-slate-500 dark:text-gray-400">
                  <span className="font-bold">College Name :</span>{" "}
                  {collegeName || (user?.unique_key ? "N/A" : "Loading...")}
                </p>

                <p className="text-sm text-slate-500 dark:text-gray-400">
                  <span className="font-bold">Branch Name :</span>{" "}
                  {branchName || (user?.unique_key ? "N/A" : "Loading...")}
                </p>

                <p className="text-sm text-slate-500 dark:text-gray-400">
                  <span className="font-bold">Year of Admission :</span>{" "}
                  {user.year_of_starting}
                </p>
              </>
            )}
          </div>

          {/* FIRST: Write / Edit Review */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md border border-slate-300 dark:border-slate-700">
              <h2 className="text-xl font-semibold mb-2 text-slate-800 dark:text-gray-100">
                {existingReview ? "Edit Your Review" : "Write a Review"}
              </h2>
              <p className="text-sm text-slate-500 dark:text-gray-400 mb-4">
                {existingReview
                  ? "Update your review about courses, teaching, placements, and more."
                  : "Share your experience about courses, teaching, placements, and more."}
              </p>

              <div className="flex gap-2">
            <button
              onClick={() => {
                setShowReviewForm((v) => !v);
              }}
              className="flex-1 bg-slate-500 dark:bg-slate-600 text-white px-4 py-2 rounded-md hover:bg-slate-600 dark:hover:bg-slate-700"
            >
              {showReviewForm
                ? "Close"
                : existingReview
                ? "Edit My Review"
                : "Write Review"}
            </button>
            {existingReview && (
              <button
                onClick={handleDeleteReview}
                className="bg-red-400 dark:bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-500 dark:hover:bg-red-600"
              >
                Delete My Review
              </button>
            )}
          </div>
        </div>

        {/* Meeting Request Form */}
        <MeetingRequestForm />
      </div>

      {/* The review form (opens for Write or Edit) */}
      {showReviewForm && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md border border-slate-300 dark:border-slate-700">
          <h2 className="text-xl font-semibold mb-4 text-slate-800 dark:text-gray-100">
            {existingReview ? "Edit Your Review" : "Submit Review"}
          </h2>

          <form onSubmit={handleReviewSubmit} className="space-y-6">
            {ratingFields.map((field) => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                  {field.label}
                </label>
                <StarRating
                  rating={
                    reviewFormData[
                      `${field.key}_rating` as keyof typeof reviewFormData
                    ] as number
                  }
                  onRatingChange={(rating) =>
                    setReviewFormData((prev) => ({
                      ...prev,
                      [`${field.key}_rating`]: rating,
                    }))
                  }
                />
                <div className="mt-2">
                  <textarea
                    placeholder={`${field.label} review...`}
                    value={
                      reviewFormData[
                        `${field.key}_review` as keyof typeof reviewFormData
                      ] as string
                    }
                    onChange={(e) => {
                      const fieldName = `${field.key}_review`;
                      setReviewFormData((prev) => ({
                        ...prev,
                        [fieldName]: e.target.value,
                      }));
                    }}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-800 dark:text-gray-200 placeholder-slate-400 dark:placeholder-gray-500"
                    rows={2}
                  />
                  <div className="mt-1 flex justify-between text-xs">
                    <span className="text-slate-500 dark:text-gray-400">
                      {((reviewFormData[`${field.key}_review` as keyof typeof reviewFormData] as string) || '').length} / 1000 characters
                    </span>
                    {(() => {
                      const text = ((reviewFormData[`${field.key}_review` as keyof typeof reviewFormData] as string) || '').trim();
                      if (text.length > 0 && text.length < 75) {
                        return <span className="text-red-600 dark:text-red-400 font-semibold">Review must contain at least 75 characters.</span>;
                      }
                      if (text.length > 1000) {
                        return <span className="text-red-600 dark:text-red-400 font-semibold">Review cannot exceed 1000 characters.</span>;
                      }
                      return null;
                    })()}
                  </div>
                </div>
              </div>
            ))}

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
                  Preferred Days for Meetings
                </label>

                <div className="grid grid-cols-2 gap-2">
                  {daysOfWeek.map((day) => (
                    <label
                      key={day}
                      className="flex items-center gap-2 text-slate-700 dark:text-gray-300"
                    >
                      <input
                        type="checkbox"
                        checked={selectedDays.includes(day)}
                        onChange={() => {
                          let updatedDays;

                          if (selectedDays.includes(day)) {
                            // remove day
                            updatedDays = selectedDays.filter((d) => d !== day);
                          } else {
                            // add day
                            updatedDays = [...selectedDays, day];
                          }

                          setReviewFormData((prev) => ({
                            ...prev,
                            preferred_day: updatedDays.join(", "),
                          }));
                        }}
                        className="text-blue-600 dark:text-sky-400"
                      />
                      {day}
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-gray-300">
                  Preferred Time for Meetings
                </label>

                <div className="flex gap-3">
                  {/* Start Time */}
                  <select
                    value={reviewFormData.start_time !== undefined ? reviewFormData.start_time : ""}
                    onChange={(e) => {
                      const start = e.target.value ? Number(e.target.value) : undefined;
                      if (start === undefined) {
                        setReviewFormData((prev) => ({
                          ...prev,
                          start_time: undefined,
                          end_time: undefined,
                          preferred_time: "",
                        }));
                      } else {
                        const end = start + 2;
                        setReviewFormData((prev) => ({
                          ...prev,
                          start_time: start,
                          end_time: end <= 23 ? end : undefined,
                          preferred_time:
                            end <= 23
                              ? `${formatTime(start)} - ${formatTime(end)}`
                              : "",
                        }));
                      }
                    }}
                    className="w-1/2 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-800 dark:text-gray-200"
                  >
                    <option value="">Start Time</option>
                    {START_HOURS.map((hour) => (
                      <option key={hour} value={hour}>
                        {formatTime(hour)}
                      </option>
                    ))}
                  </select>

                  {/* End Time */}
                  <select
                    value={reviewFormData.end_time !== undefined ? reviewFormData.end_time : ""}
                    onChange={(e) => {
                      const end = e.target.value ? Number(e.target.value) : undefined;
                      if (reviewFormData.start_time !== undefined && end !== undefined) {
                        setReviewFormData((prev) => ({
                          ...prev,
                          end_time: end,
                          preferred_time: `${formatTime(
                            prev.start_time!
                          )} - ${formatTime(end)}`,
                        }));
                      }
                    }}
                    disabled={!reviewFormData.start_time}
                    className="w-1/2 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-800 dark:text-gray-200 disabled:opacity-60"
                  >
                    <option value="">End Time</option>
                    {reviewFormData.start_time !== undefined && (
                      <>
                        {Array.from(
                          { length: 23 - (reviewFormData.start_time + 1) },
                          (_, i) => reviewFormData.start_time! + 2 + i
                        )
                          .filter((h) => h <= 23)
                          .map((hour) => (
                            <option key={hour} value={hour}>
                              {formatTime(hour)}
                            </option>
                          ))}
                      </>
                    )}
                  </select>
                </div>

                {/* Display Output */}
                {reviewFormData.preferred_time && (
                  <p className="text-sm text-slate-600 dark:text-gray-400">
                    Selected: <strong>{reviewFormData.preferred_time}</strong>
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={submittingReview || !isFormValid}
                className="bg-blue-600 hover:bg-blue-700 dark:bg-sky-400 dark:hover:bg-sky-500 text-white px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submittingReview
                  ? "Saving..."
                  : existingReview
                  ? "Save Changes"
                  : "Submit Review"}
              </button>
            </div>
          </form>
        </div>
      )}
        </>
      )}
    </div>
  );
};

export default StudyingDashboard;
