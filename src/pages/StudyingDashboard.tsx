import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { reviewService, meetingService, branchService } from "../services/api";
import StarRating from "../components/StarRating";
import type { Meeting, Review } from "../types";

const StudyingDashboard = () => {
  const { user, loading: authLoading } = useAuth();

  const [invitations, setInvitations] = useState<Meeting[]>([]);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [branchName, setBranchName] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [existingReview, setExistingReview] = useState<Review | null>(null);
  const [submittingReview, setSubmittingReview] = useState(false);
  
  // AI Detection state: only used during submission
  const [validationSummary, setValidationSummary] = useState<Record<string, 'HUMAN-WRITTEN' | 'AI-GENERATED'> | null>(null);
  const [showValidationSummary, setShowValidationSummary] = useState(false);

  const daysOfWeek = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  // remember the last submitted review so we can edit it
  const reviewFormInit = {
    unique_key: user?.unique_key || "",
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
  };
  const [reviewFormData, setReviewFormData] = useState(reviewFormInit);

  const selectedDays = reviewFormData.preferred_day
    ? reviewFormData.preferred_day.split(", ").map((d) => d.trim())
    : [];

  const formatTime = (hour) => {
    const period = hour >= 12 ? "PM" : "AM";
    const h = hour % 12 === 0 ? 12 : hour % 12;
    return `${h}${period}`;
  };

  const START_HOURS = Array.from({ length: 22 }, (_, i) => i); // 12AM(0) → 9PM(21)

  useEffect(() => {
    // load branch display name
    const loadBranch = async () => {
      try {
        if (user?.unique_key_data) {
          setBranchName(user.unique_key_data.branch_name || "");
          setCollegeName(user.unique_key_data.college.college_name || "");
        } else {
          setBranchName("");
          setCollegeName("");
        }
      } catch (err) {
        console.error("Error loading branch:", err);
        setBranchName("");
        setCollegeName("");
      }
    };

    // load meeting requests
    const loadInvitations = async () => {
      try {
        const data = await meetingService.myInvitations();
        if (Array.isArray(data)) {
          setInvitations(data.filter((m) => m.status === "requested"));
        } else {
          setInvitations([]);
        }
      } catch (err) {
        console.error("Error loading invitations:", err);
        setInvitations([]);
      }
    };

    // load existing review
    const loadExistingReview = async () => {
      try {
        if (user?.unique_key) {
          const review = await reviewService.myReview(user.unique_key);
          if (review && review.review_id) {
            // Only set as existing review if it has a review_id
            setExistingReview(review);
            // Pre-fill form with existing review data
            setReviewFormData({
              unique_key: user.unique_key,
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
            });
          } else {
            setExistingReview(null);
            setReviewFormData(reviewFormInit);
          }
        } else {
          setExistingReview(null);
        }
      } catch (err) {
        console.error("Error loading existing review:", err);
        setExistingReview(null);
      }
    };

    // Only load data if user is authenticated and not loading
    // Also check if we have tokens in localStorage
    const hasTokens = typeof window !== 'undefined' && localStorage.getItem('tokens');
    if (!authLoading && user && hasTokens) {
      loadBranch();
      loadInvitations();
      loadExistingReview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.unique_key_data, authLoading, user]);


  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingReview) return; // Prevent multiple submissions
    if (!user?.unique_key_data) {
      alert(
        "Please set your branch in your profile before submitting a review."
      );
      return;
    }

    // CRITICAL: Validate all fields before submission (only on submit)
    setSubmittingReview(true);
    setShowValidationSummary(false);
    setValidationSummary(null);
    
    try {
      // Build reviews object with all text fields
      const reviews: Record<string, string> = {};
      ratingFields.forEach(field => {
        const fieldName = `${field.key}_review`;
        reviews[fieldName] = (reviewFormData[fieldName as keyof typeof reviewFormData] as string) || '';
      });
      
      const result = await reviewService.validateAll(reviews);
      
      // Store summary for display
      setValidationSummary(result.results);
      setShowValidationSummary(true);
      
      if (!result.can_submit) {
        // Build error message from validation summary
        const aiFields = Object.entries(result.results)
          .filter(([_, label]) => label === 'AI-GENERATED')
          .map(([fieldName, _]) => {
            const fieldKey = fieldName.replace('_review', '');
            const field = ratingFields.find(f => f.key === fieldKey);
            return field ? field.label : fieldName;
          });
        
        const humanFields = Object.entries(result.results)
          .filter(([fieldName, label]) => {
            const text = reviewFormData[fieldName as keyof typeof reviewFormData] as string;
            return label === 'HUMAN-WRITTEN' && text && text.trim();
          })
          .map(([fieldName, _]) => {
            const fieldKey = fieldName.replace('_review', '');
            const field = ratingFields.find(f => f.key === fieldKey);
            return field ? field.label : fieldName;
          });
        
        // Show detailed summary
        let message = `Review Validation Results:\n\n`;
        if (humanFields.length > 0) {
          message += `✅ HUMAN-WRITTEN:\n${humanFields.join(', ')}\n\n`;
        }
        if (aiFields.length > 0) {
          message += `❌ AI-GENERATED:\n${aiFields.join(', ')}\n\n`;
        }
        message += `Submission blocked. Please rewrite the AI-generated fields in your own words.`;
        
        alert(message);
        setSubmittingReview(false);
        return;
      }

      // All validations passed, proceed with submission
      await reviewService.create(reviewFormData);
      alert(
        existingReview
          ? "Review updated successfully!"
          : "Review submitted successfully!"
      );
      // Reload existing review
      if (user?.unique_key) {
        const review = await reviewService.myReview(user.unique_key);
        setExistingReview(review);
      }
      // Reset validation summary
      setShowValidationSummary(false);
      setValidationSummary(null);
      setShowReviewForm(false); // collapse the form after submit
    } catch (err: any) {
      // Handle backend validation errors
      if (err.response?.data?.error && err.response.data.error.includes('AI-generated')) {
        const aiFields = err.response.data.field_display_names || [];
        alert(
          `Review submission rejected!\n\n` +
          `The following fields contain AI-generated text:\n${aiFields.join(', ')}\n\n` +
          `Please rewrite these sections in your own words.`
        );
      } else {
        alert(err.response?.data?.error || err.response?.data?.message || "Error submitting review");
      }
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!user?.unique_key) return;

    if (
      !confirm(
        "Are you sure you want to delete your review? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      await reviewService.delete(user.unique_key);
      setExistingReview(null);
      setReviewFormData(reviewFormInit);
      setShowReviewForm(false);
      alert("Review deleted successfully!");
    } catch (err: any) {
      alert(err.response?.data?.error || "Error deleting review");
    }
  };

  const handleMeetingStatus = async (meetingId: number, status: string) => {
    try {
      await meetingService.updateStatus(meetingId, status);
      const data = await meetingService.myInvitations();
      setInvitations(data.filter((m) => m.status === "requested"));
    } catch (err: any) {
      alert(err.response?.data?.error || "Error updating meeting status");
    }
  };

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


  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
              {collegeName || "Loading..."}
            </p>

            <p className="text-sm text-slate-500 dark:text-gray-400">
              <span className="font-bold">Branch Name :</span>{" "}
              {branchName || "Loading..."}
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

        {/* Meeting Requests stays second */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md border border-slate-300 dark:border-slate-700">
          <h2 className="text-xl font-semibold mb-4 text-slate-800 dark:text-gray-100">
            Meeting Requests ({invitations.length})
          </h2>
          {invitations.length === 0 ? (
            <p className="text-slate-500 dark:text-gray-400">
              No pending requests
            </p>
          ) : (
            <div className="space-y-2">
              {invitations.map((meeting) => (
                <div
                  key={meeting.meeting_id}
                  className="p-3 bg-slate-50 dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600"
                >
                  <p className="text-sm text-slate-800 dark:text-gray-200">
                    Request from: {meeting.counselling_user_id_data?.name || meeting.counselling_user_id_data?.email_id || meeting.counselling_user_id}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() =>
                        handleMeetingStatus(meeting.meeting_id, "accepted")
                      }
                      className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() =>
                        handleMeetingStatus(meeting.meeting_id, "rejected")
                      }
                      className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
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
                    value={reviewFormData.start_time || ""}
                    onChange={(e) => {
                      const start = Number(e.target.value);
                      const end = start + 2;

                      setReviewFormData((prev) => ({
                        ...prev,
                        start_time: start,
                        end_time: end <= 23 ? end : "",
                        preferred_time:
                          end <= 23
                            ? `${formatTime(start)} - ${formatTime(end)}`
                            : "",
                      }));
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
                    value={reviewFormData.end_time || ""}
                    onChange={(e) => {
                      const end = Number(e.target.value);

                      setReviewFormData((prev) => ({
                        ...prev,
                        end_time: end,
                        preferred_time: `${formatTime(
                          prev.start_time
                        )} - ${formatTime(end)}`,
                      }));
                    }}
                    disabled={!reviewFormData.start_time}
                    className="w-1/2 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-800 dark:text-gray-200 disabled:opacity-60"
                  >
                    <option value="">End Time</option>
                    {reviewFormData.start_time !== undefined &&
                      Array.from(
                        { length: 23 - (reviewFormData.start_time + 1) },
                        (_, i) => reviewFormData.start_time + 2 + i
                      )
                        .filter((h) => h <= 23)
                        .map((hour) => (
                          <option key={hour} value={hour}>
                            {formatTime(hour)}
                          </option>
                        ))}
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

            {/* Validation Summary - shown after submit attempt */}
            {showValidationSummary && validationSummary && (
              <div className="mb-4 p-4 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-300 dark:border-slate-600">
                <h3 className="text-sm font-semibold mb-3 text-slate-800 dark:text-gray-200">
                  Review Validation Results
                </h3>
                <div className="space-y-2 text-sm">
                  {ratingFields.map(field => {
                    const fieldName = `${field.key}_review`;
                    const text = reviewFormData[fieldName as keyof typeof reviewFormData] as string;
                    const label = validationSummary[fieldName];
                    
                    if (!text || !text.trim()) return null;
                    
                    return (
                      <div key={field.key} className="flex items-center justify-between py-1">
                        <span className="text-slate-700 dark:text-gray-300">{field.label}:</span>
                        <span className={
                          label === 'HUMAN-WRITTEN' 
                            ? "text-green-600 dark:text-green-400 font-medium" 
                            : label === 'AI-GENERATED'
                            ? "text-red-600 dark:text-red-400 font-medium"
                            : "text-slate-500 dark:text-gray-400"
                        }>
                          {label === 'HUMAN-WRITTEN' ? '✅ HUMAN-WRITTEN' : label === 'AI-GENERATED' ? '❌ AI-GENERATED' : '⏳ Unchecked'}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {Object.values(validationSummary).some(label => label === 'AI-GENERATED') && (
                  <div className="mt-3 p-3 bg-red-100 dark:bg-red-900/30 rounded text-sm text-red-800 dark:text-red-200">
                    ⚠️ <strong>Submission blocked:</strong> Some fields contain AI-generated content. Please rewrite them in your own words.
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={submittingReview}
                className="bg-blue-600 hover:bg-blue-700 dark:bg-sky-400 dark:hover:bg-sky-500 text-white px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submittingReview
                  ? "Validating & Saving..."
                  : existingReview
                  ? "Save Changes"
                  : "Submit Review"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default StudyingDashboard;
