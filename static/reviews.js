const reviewForm = document.getElementById("review-form");
const reviewIdInput = document.getElementById("review-id");
const reviewCourseNameInput = document.getElementById("review-course-name");
const reviewCourseCodeInput = document.getElementById("review-course-code");
const reviewInstructorInput = document.getElementById("review-instructor");
const reviewTermInput = document.getElementById("review-term");
const reviewDifficultyInput = document.getElementById("review-difficulty");
const reviewWorkloadInput = document.getElementById("review-workload");
const reviewAttendanceInput = document.getElementById("review-attendance");
const reviewAssessmentInput = document.getElementById("review-assessment");
const reviewCommentInput = document.getElementById("review-comment");
const reviewPublicInput = document.getElementById("review-public");
const reviewModeLabel = document.getElementById("review-mode-label");
const reviewFormMessage = document.getElementById("review-form-message");
const commentCount = document.getElementById("comment-count");
const deleteReviewButton = document.getElementById("delete-review-btn");
const reviewSearchInput = document.getElementById("review-search-input");
const reviewList = document.getElementById("review-list");
const myReviewList = document.getElementById("my-review-list");
const reviewDetail = document.getElementById("review-detail");

let selectedCourseKey = "";

function setFormMessage(message, type = "") {
  reviewFormMessage.textContent = message;
  reviewFormMessage.className = `form-message ${type}`.trim();
}

function setDefaultTerm() {
  if (!reviewTermInput.value) {
    reviewTermInput.value = `${new Date().getFullYear()}年度`;
  }
}

function resetReviewForm() {
  reviewForm.reset();
  reviewIdInput.value = "";
  reviewModeLabel.textContent = "新規入力";
  deleteReviewButton.disabled = true;
  commentCount.textContent = "0";
  setFormMessage("");
  setDefaultTerm();
}

function setText(parent, tag, text, className = "") {
  const element = document.createElement(tag);
  element.textContent = text || "";
  if (className) element.className = className;
  parent.appendChild(element);
  return element;
}

function formatScore(value) {
  return value === null || value === undefined ? "-" : `${value}/5`;
}

function renderReviewList(reviews) {
  reviewList.innerHTML = "";
  if (!reviews.length) {
    setText(reviewList, "p", "公開レビューがまだありません。最初のレビューを投稿できます。", "empty-reviews");
    return;
  }

  reviews.forEach((review) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "review-card";
    setText(button, "p", review.course_name, "review-card-title");
    const meta = [review.course_code, review.instructor].filter(Boolean).join(" / ");
    setText(button, "p", meta || "科目コード・担当者情報なし", "review-card-meta");
    const stats = document.createElement("div");
    stats.className = "review-card-stats";
    setText(stats, "span", `難易度 ${formatScore(review.average_difficulty)}`);
    setText(stats, "span", `課題量 ${formatScore(review.average_workload)}`);
    setText(stats, "span", `${review.review_count}件のレビュー`);
    button.appendChild(stats);
    button.addEventListener("click", () => loadReviewDetail(review.course_key));
    reviewList.appendChild(button);
  });
}

function renderMyReviewList(reviews) {
  myReviewList.innerHTML = "";
  if (!reviews.length) {
    setText(myReviewList, "p", "保存したレビューはありません。", "empty-reviews");
    return;
  }

  reviews.forEach((review) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "review-card";
    const visibility = review.is_public ? "公開中" : "非公開";
    const reportState = review.is_reported ? "・通報確認中" : "";
    setText(button, "p", review.course_name, "review-card-title");
    setText(button, "p", `${visibility}${reportState} / ${review.term || "時期未設定"}`, "review-card-meta");
    button.addEventListener("click", () => fillReviewForm(review));
    myReviewList.appendChild(button);
  });
}

function renderDetail(data) {
  reviewDetail.hidden = false;
  reviewDetail.innerHTML = "";
  const aggregate = data.aggregate;
  setText(reviewDetail, "h3", aggregate.course_name);
  const meta = [aggregate.course_code, aggregate.instructor].filter(Boolean).join(" / ");
  setText(reviewDetail, "p", meta || "科目コード・担当者情報なし", "review-card-meta");

  const summary = document.createElement("div");
  summary.className = "detail-summary";
  const metrics = [
    ["難易度", formatScore(aggregate.average_difficulty)],
    ["課題量", formatScore(aggregate.average_workload)],
    ["回答数", `${aggregate.review_count}件`],
  ];
  metrics.forEach(([label, value]) => {
    const metric = document.createElement("div");
    metric.className = "detail-metric";
    setText(metric, "span", label);
    setText(metric, "strong", value);
    summary.appendChild(metric);
  });
  reviewDetail.appendChild(summary);

  const commentHeading = document.createElement("h4");
  commentHeading.textContent = "匿名コメント";
  reviewDetail.appendChild(commentHeading);
  const commentList = document.createElement("div");
  commentList.className = "comment-list";
  if (!data.comments.length) {
    setText(commentList, "p", "公開コメントはまだありません。", "empty-reviews");
  } else {
    data.comments.forEach((comment) => {
      const item = document.createElement("article");
      item.className = "review-comment";
      const metaText = [comment.term, comment.attendance, comment.assessment]
        .filter(Boolean)
        .join(" / ");
      setText(item, "div", metaText || "開講時期・評価方法の記載なし", "comment-meta");
      setText(item, "p", comment.comment);
      const actions = document.createElement("div");
      actions.className = "comment-actions";
      const reportButton = document.createElement("button");
      reportButton.type = "button";
      reportButton.textContent = "通報して非表示";
      reportButton.addEventListener("click", () => reportReview(comment.id));
      actions.appendChild(reportButton);
      item.appendChild(actions);
      commentList.appendChild(item);
    });
  }
  reviewDetail.appendChild(commentList);

  if (data.own_reviews.length) {
    const own = data.own_reviews[0];
    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "action-button small";
    editButton.textContent = "自分のレビューを編集";
    editButton.addEventListener("click", () => fillReviewForm(own));
    reviewDetail.appendChild(editButton);
  }
}

async function loadReviewList() {
  const query = reviewSearchInput.value.trim();
  const response = await fetch(`/api/reviews?query=${encodeURIComponent(query)}`);
  if (!response.ok) throw new Error("レビュー一覧を取得できませんでした");
  renderReviewList(await response.json());
}

async function loadMyReviews() {
  const response = await fetch("/api/reviews/mine");
  if (!response.ok) throw new Error("自分のレビューを取得できませんでした");
  renderMyReviewList(await response.json());
}

async function loadReviewDetail(courseKey) {
  selectedCourseKey = courseKey;
  const response = await fetch(`/api/reviews/detail?course_key=${encodeURIComponent(courseKey)}`);
  if (!response.ok) throw new Error("レビュー詳細を取得できませんでした");
  renderDetail(await response.json());
}

function fillReviewForm(review) {
  reviewIdInput.value = review.id || "";
  reviewCourseNameInput.value = review.course_name || "";
  reviewCourseCodeInput.value = review.course_code || "";
  reviewInstructorInput.value = review.instructor || "";
  reviewTermInput.value = review.term || "";
  reviewDifficultyInput.value = review.difficulty || "3";
  reviewWorkloadInput.value = review.workload || "3";
  reviewAttendanceInput.value = review.attendance || "不明";
  reviewAssessmentInput.value = review.assessment || "";
  reviewCommentInput.value = review.comment || "";
  reviewPublicInput.checked = Boolean(review.is_public);
  reviewModeLabel.textContent = "編集中";
  deleteReviewButton.disabled = !review.id;
  commentCount.textContent = reviewCommentInput.value.length;
  setFormMessage("自分のレビューを編集しています。", "success");
  reviewForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function saveReview(event) {
  event.preventDefault();
  const payload = {
    course_name: reviewCourseNameInput.value.trim(),
    course_code: reviewCourseCodeInput.value.trim(),
    instructor: reviewInstructorInput.value.trim(),
    term: reviewTermInput.value.trim(),
    difficulty: Number(reviewDifficultyInput.value),
    workload: Number(reviewWorkloadInput.value),
    attendance: reviewAttendanceInput.value,
    assessment: reviewAssessmentInput.value.trim(),
    comment: reviewCommentInput.value.trim(),
    is_public: reviewPublicInput.checked,
  };

  try {
    const response = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "保存できませんでした");
    setFormMessage("レビューを保存しました。", "success");
    await loadReviewList();
    await loadMyReviews();
    const key = `${payload.course_code ? "code:" : "name:"}${(payload.course_code || payload.course_name).normalize("NFKC").toLowerCase().replace(/\s+/g, "")}`;
    await loadReviewDetail(key).catch(() => {});
    fillReviewForm({ ...payload, id: result.review_id });
  } catch (error) {
    setFormMessage(error.message, "error");
  }
}

async function deleteReview() {
  const reviewId = reviewIdInput.value;
  if (!reviewId || !window.confirm("このレビューを削除しますか？")) return;
  const response = await fetch(`/api/reviews/${reviewId}`, { method: "DELETE" });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || "削除できませんでした");
  resetReviewForm();
  await loadReviewList();
  await loadMyReviews();
  if (selectedCourseKey) await loadReviewDetail(selectedCourseKey).catch(() => {});
}

async function reportReview(reviewId) {
  if (!window.confirm("このレビューを公開一覧から非表示にしますか？")) return;
  const response = await fetch(`/api/reviews/${reviewId}/report`, { method: "POST" });
  const result = await response.json();
  if (!response.ok) {
    window.alert(result.message || "通報できませんでした");
    return;
  }
  await loadReviewList();
  await loadMyReviews();
  if (selectedCourseKey) {
    await loadReviewDetail(selectedCourseKey).catch(() => {
      reviewDetail.hidden = true;
    });
  }
}

reviewForm.addEventListener("submit", saveReview);
document.getElementById("reset-review-btn").addEventListener("click", resetReviewForm);
deleteReviewButton.addEventListener("click", () => deleteReview().catch((error) => setFormMessage(error.message, "error")));
document.getElementById("search-reviews-btn").addEventListener("click", () => loadReviewList().catch((error) => setFormMessage(error.message, "error")));
document.getElementById("refresh-reviews-btn").addEventListener("click", () => loadReviewList().catch((error) => setFormMessage(error.message, "error")));
reviewSearchInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") loadReviewList().catch((error) => setFormMessage(error.message, "error"));
});
reviewCommentInput.addEventListener("input", () => {
  commentCount.textContent = reviewCommentInput.value.length;
});

resetReviewForm();
Promise.all([loadReviewList(), loadMyReviews()]).catch((error) => setFormMessage(error.message, "error"));
