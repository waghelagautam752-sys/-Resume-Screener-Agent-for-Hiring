/* -------------------------------------------------------------
 * TALENTRANK - ENTERPRISE DASHBOARD CONTROLLER
 * Concurrent batch files, High-Density Table & Deep-Dive Drawer
 * ------------------------------------------------------------- */

document.addEventListener("DOMContentLoaded", () => {
    // API Endpoints
    const API_SAMPLES = "/api/samples";
    const API_SAMPLE_CONTENT = "/api/sample-content";
    const API_SCREEN_BATCH = "/api/screen-batch";

    // Client-side Batch Files Queue
    let fileQueue = [];
    let processedCandidatesList = []; // Caches the full response results

    // DOM Elements - Config & Intake
    const jdSelect = document.getElementById("jd-select");
    const jdText = document.getElementById("jd-text");
    const providerSelect = document.getElementById("provider-select");
    
    const dropZone = document.getElementById("drop-zone");
    const batchFilesInput = document.getElementById("batch-files");
    const fileListContainer = document.getElementById("file-list-container");
    const fileCountText = document.getElementById("file-count");
    const fileScrollList = document.getElementById("file-scroll-list");
    const clearFilesBtn = document.getElementById("clear-files-btn");
    
    const btnRunBatch = document.getElementById("btn-run-batch");
    const btnDemoBatch = document.getElementById("btn-demo-batch");

    // DOM Elements - Dashboard States
    const emptyState = document.getElementById("empty-state");
    const loadingState = document.getElementById("loading-state");
    const resultsDashboard = document.getElementById("results-dashboard");
    const batchProgressFill = document.getElementById("batch-progress-fill");
    const batchProgressStats = document.getElementById("batch-progress-stats");

    // DOM Elements - KPI Summary
    const kpiTotal = document.getElementById("kpi-total");
    const kpiShortlisted = document.getElementById("kpi-shortlisted");
    const kpiReview = document.getElementById("kpi-review");
    const kpiRejected = document.getElementById("kpi-rejected");
    
    const rankedCandidatesRows = document.getElementById("ranked-candidates-rows");
    const btnExportCsv = document.getElementById("btn-export-csv");

    // DOM Elements - Slide Drawer Panel
    const drawerOverlay = document.getElementById("drawer-overlay");
    const reportDrawer = document.getElementById("report-drawer");
    const btnCloseDrawer = document.getElementById("btn-close-drawer");
    
    const drawerCandName = document.getElementById("drawer-cand-name");
    const drawerCandFile = document.getElementById("drawer-cand-file");
    const dResScore = document.getElementById("d-res-score");
    const dResConfidence = document.getElementById("d-res-confidence");
    const dResRecommendation = document.getElementById("d-res-recommendation");
    const dResReasoning = document.getElementById("d-res-reasoning");
    
    const dResFlagsContainer = document.getElementById("d-res-flags-container");
    const dResFlags = document.getElementById("d-res-flags");

    // Initialize Page
    fetchJdTemplates();
    setupIntakeEvents();
    setupDrawerTabs();

    /* =========================================================================
     * INITIALIZING TEMPLATE SELECTION
     * ========================================================================= */
    
    async function fetchJdTemplates() {
        try {
            const response = await fetch(API_SAMPLES);
            const data = await response.json();
            
            // Populate Jd templates selector
            data.job_descriptions.forEach(jd => {
                const opt = document.createElement("option");
                opt.value = jd;
                opt.textContent = jd.replace(/_/g, " ").replace(".txt", "");
                jdSelect.appendChild(opt);
            });

            // Bind selection loader
            jdSelect.addEventListener("change", async () => {
                if (jdSelect.value) {
                    const res = await fetch(`${API_SAMPLE_CONTENT}?type=jd&filename=${jdSelect.value}`);
                    const data = await res.json();
                    jdText.value = data.text;
                } else {
                    jdText.value = "";
                }
            });
        } catch (err) {
            console.error("Failed to load Job templates:", err);
        }
    }

    /* =========================================================================
     * BATCH INTAKE FILES MANAGEMENT
     * ========================================================================= */

    function setupIntakeEvents() {
        // Drag & Drop Bindings
        dropZone.addEventListener("click", () => batchFilesInput.click());
        batchFilesInput.addEventListener("change", () => addFilesToQueue(batchFilesInput.files));

        ["dragenter", "dragover"].forEach(name => {
            dropZone.addEventListener(name, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropZone.style.borderColor = "var(--accent-indigo)";
                dropZone.style.background = "rgba(99, 102, 241, 0.03)";
            });
        });

        ["dragleave", "drop"].forEach(name => {
            dropZone.addEventListener(name, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropZone.style.borderColor = "var(--border-color)";
                dropZone.style.background = "rgba(255,255,255,0.01)";
            });
        });

        dropZone.addEventListener("drop", (e) => {
            addFilesToQueue(e.dataTransfer.files);
        });

        clearFilesBtn.addEventListener("click", () => {
            fileQueue = [];
            renderFileQueue();
        });

        // Close Drawer Overlay Click Bindings
        btnCloseDrawer.addEventListener("click", closeDrawer);
        drawerOverlay.addEventListener("click", closeDrawer);
        
        // Export CSV binding
        btnExportCsv.addEventListener("click", exportRankingsToCSV);
    }

    function addFilesToQueue(files) {
        const allowedExtensions = [".pdf", ".docx", ".txt"];
        
        Array.from(files).forEach(file => {
            const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
            if (allowedExtensions.includes(ext)) {
                // Prevent duplicate additions
                if (!fileQueue.some(f => f.name === file.name && f.size === file.size)) {
                    fileQueue.push(file);
                }
            }
        });
        renderFileQueue();
    }

    function renderFileQueue() {
        fileScrollList.innerHTML = "";
        
        if (fileQueue.length > 0) {
            fileListContainer.classList.remove("hidden");
            fileCountText.textContent = `${fileQueue.length} files loaded`;
            
            fileQueue.forEach((file, idx) => {
                const row = document.createElement("div");
                row.className = "file-row";
                row.innerHTML = `
                    <span><i class="fa-regular fa-file"></i> ${file.name}</span>
                    <i class="fa-solid fa-xmark remove-file-btn" data-idx="${idx}"></i>
                `;
                fileScrollList.appendChild(row);
            });

            // Bind individual row deletion
            document.querySelectorAll(".remove-file-btn").forEach(btn => {
                btn.addEventListener("click", (e) => {
                    const index = parseInt(btn.getAttribute("data-idx"));
                    fileQueue.splice(index, 1);
                    renderFileQueue();
                });
            });
        } else {
            fileListContainer.classList.add("hidden");
            fileCountText.textContent = "0 files selected";
        }
    }

    /* =========================================================================
     * LAUNCH BATCH OPERATIONS
     * ========================================================================= */

    btnRunBatch.addEventListener("click", () => triggerBatchScreening(false));
    btnDemoBatch.addEventListener("click", () => triggerBatchScreening(true));

    async function triggerBatchScreening(useSamples = false) {
        const jobDesc = jdText.value.trim();
        
        if (!useSamples && fileQueue.length === 0) {
            alert("Error: Please load candidate files in the intake panel first.");
            return;
        }

        if (!jobDesc) {
            alert("Error: Please specify the job requirement specs to assess against.");
            return;
        }

        // Prep Dashboard view states
        emptyState.classList.add("hidden");
        resultsDashboard.classList.add("hidden");
        loadingState.classList.remove("hidden");
        
        const activeBtn = useSamples ? btnDemoBatch : btnRunBatch;
        activeBtn.classList.add("loading");
        
        // Progress simulation intervals
        let percent = 0;
        batchProgressFill.style.width = "0%";
        batchProgressStats.textContent = "Parsing documents (0%)...";
        
        const progressTimer = setInterval(() => {
            if (percent < 90) {
                percent += Math.floor(Math.random() * 8) + 3;
                percent = Math.min(percent, 92);
                batchProgressFill.style.width = `${percent}%`;
                
                if (percent < 30) {
                    batchProgressStats.textContent = `Parsing structural profiles (${percent}%)...`;
                } else if (percent < 65) {
                    batchProgressStats.textContent = `Extracting tech core skills (${percent}%)...`;
                } else {
                    batchProgressStats.textContent = `Performing semantic job matching (${percent}%)...`;
                }
            }
        }, 800);

        // Prep Multipart FormData payload
        const formData = new FormData();
        formData.append("job_description", jobDesc);
        formData.append("llm_provider", providerSelect.value);
        
        if (useSamples) {
            formData.append("use_samples", "true");
        } else {
            fileQueue.forEach(file => {
                formData.append("files", file);
            });
        }

        try {
            const response = await fetch(API_SCREEN_BATCH, {
                method: "POST",
                body: formData
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || "Batch processing failed.");
            }

            const data = await response.json();
            processedCandidatesList = data.results || [];
            
            clearInterval(progressTimer);
            
            // Fast fill to complete
            batchProgressFill.style.width = "100%";
            batchProgressStats.textContent = "Assessment synthesized! Generating dashboard...";
            
            setTimeout(() => {
                renderDashboardResults();
                loadingState.classList.add("hidden");
                resultsDashboard.classList.remove("hidden");
                activeBtn.classList.remove("loading");
            }, 600);

        } catch (error) {
            clearInterval(progressTimer);
            loadingState.classList.add("hidden");
            emptyState.classList.remove("hidden");
            activeBtn.classList.remove("loading");
            alert(`Workflow Error: ${error.message}`);
            console.error("Batch screen failed:", error);
        }
    }

    /* =========================================================================
     * DASHBOARD RENDERING & CSV EXPORT
     * ========================================================================= */

    function renderDashboardResults() {
        const total = processedCandidatesList.length;
        
        // Count metrics
        const recommendedCount = processedCandidatesList.filter(c => c.match_score >= 0.7).length;
        const reviewCount = processedCandidatesList.filter(c => c.match_score >= 0.4 && c.match_score < 0.7).length;
        const rejectedCount = processedCandidatesList.filter(c => c.match_score < 0.4).length;

        kpiTotal.textContent = total;
        kpiShortlisted.textContent = recommendedCount;
        kpiReview.textContent = reviewCount;
        kpiRejected.textContent = rejectedCount;

        // Render ranked table rows
        rankedCandidatesRows.innerHTML = "";
        
        processedCandidatesList.forEach((c, index) => {
            const row = document.createElement("tr");
            row.setAttribute("data-cand-idx", index);
            
            // Format match score cell
            const scorePercent = Math.round(c.match_score * 100);
            let scoreClass = "score-low";
            if (scorePercent >= 70) scoreClass = "score-high";
            else if (scorePercent >= 40) scoreClass = "score-mid";

            // Format recommendation cell
            const rec = c.recommendation || "Reject";
            let recClass = "reject";
            if (rec.toLowerCase().includes("interview") || rec.toLowerCase().includes("proceed")) recClass = "proceed";
            else if (rec.toLowerCase().includes("review")) recClass = "review";

            // Extract main technical skills to show in table
            let coreSkills = "None extracted";
            const extSkills = c.raw_details?.extracted_skills || [];
            if (extSkills.length > 0) {
                // Display first 4 technical skills
                const techSkills = extSkills.filter(s => s.category === "technical" || s.category === "framework").map(s => s.name);
                if (techSkills.length > 0) {
                    coreSkills = techSkills.slice(0, 4).join(", ");
                } else {
                    coreSkills = extSkills.slice(0, 4).map(s => s.name).join(", ");
                }
            }

            const flagSummary = c.flags && c.flags.length > 0 ? c.flags[0] : "All criteria matched";

            row.innerHTML = `
                <td style="font-weight:700; text-align:center;">${index + 1}</td>
                <td>${c.candidate_name}</td>
                <td><span class="score-pill ${scoreClass}">${scorePercent}%</span></td>
                <td><span class="rec-tag ${recClass}">${rec}</span></td>
                <td>${c.years_experience > 0 ? c.years_experience + " yrs" : "Not specified"}</td>
                <td class="table-flag-summary">${flagSummary}</td>
                <td style="text-align:center;">
                    <button class="table-btn-view">Details</button>
                </td>
            `;

            // Bind click to open drawer
            row.addEventListener("click", () => {
                openDrawer(c);
            });

            rankedCandidatesRows.appendChild(row);
        });
    }

    function exportRankingsToCSV() {
        if (processedCandidatesList.length === 0) return;
        
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Rank,Candidate Name,Match Score %,Recommendation,Years Experience,Flags/Gaps,Executive Summary\n";
        
        processedCandidatesList.forEach((c, index) => {
            const rowData = [
                index + 1,
                `"${c.candidate_name.replace(/"/g, '""')}"`,
                Math.round(c.match_score * 100),
                `"${c.recommendation}"`,
                c.years_experience,
                `"${(c.flags || []).join(' | ').replace(/"/g, '""')}"`,
                `"${(c.reasoning || '').replace(/\n/g, ' ').replace(/"/g, '""')}"`
            ];
            csvContent += rowData.join(",") + "\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "talentrank_shortlist.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    /* =========================================================================
     * PROFILE DRAWER DEEP-DIVE PORTAL
     * ========================================================================= */

    function openDrawer(candidate) {
        drawerOverlay.style.display = "block";
        reportDrawer.classList.add("open");

        // Set core header & KPIs
        drawerCandName.textContent = candidate.candidate_name;
        drawerCandFile.textContent = candidate.filename;
        
        const scoreVal = Math.round(candidate.match_score * 100);
        dResScore.textContent = `${scoreVal}%`;
        dResScore.className = "";
        if (scoreVal >= 70) dResScore.classList.add("text-success");
        else if (scoreVal >= 40) dResScore.classList.add("text-warning");
        else dResScore.classList.add("text-danger");

        dResConfidence.textContent = `${Math.round(candidate.confidence * 100)}%`;
        dResRecommendation.textContent = candidate.recommendation;
        dResReasoning.textContent = candidate.reasoning;

        // Populate drawer flags
        if (candidate.flags && candidate.flags.length > 0) {
            dResFlagsContainer.classList.remove("hidden");
            dResFlags.innerHTML = "";
            candidate.flags.forEach(flag => {
                const badge = document.createElement("span");
                badge.className = "flag-pill";
                badge.textContent = flag;
                dResFlags.appendChild(badge);
            });
        } else {
            dResFlagsContainer.classList.add("hidden");
        }

        // Cache candidate to populate internal tabs
        reportDrawer.setAttribute("data-cand-idx", processedCandidatesList.indexOf(candidate));
        
        // Auto select first tab
        document.querySelector(".d-tab[data-tab-id='d-skills-tab']").click();
    }

    function closeDrawer() {
        reportDrawer.classList.remove("open");
        setTimeout(() => {
            drawerOverlay.style.display = "none";
        }, 200);
    }

    function setupDrawerTabs() {
        document.querySelectorAll(".d-tab").forEach(tab => {
            tab.addEventListener("click", () => {
                document.querySelectorAll(".d-tab").forEach(t => t.classList.remove("active"));
                document.querySelectorAll(".drawer-tab-content").forEach(c => c.classList.remove("active"));
                
                tab.classList.add("active");
                const target = tab.getAttribute("data-tab-id");
                document.getElementById(target).classList.add("active");
                
                // Load tab specific content based on cached candidate index
                const idx = parseInt(reportDrawer.getAttribute("data-cand-idx"));
                if (!isNaN(idx) && processedCandidatesList[idx]) {
                    renderDrawerTabContent(target, processedCandidatesList[idx]);
                }
            });
        });
    }

    function renderDrawerTabContent(tabId, candidate) {
        const details = candidate.raw_details || {};
        
        if (tabId === "d-skills-tab") {
            const match = details.skills_match || {};
            const extSkills = details.extracted_skills || [];
            
            const matchedRequiredEl = document.getElementById("d-skills-matched-required");
            const missingRequiredEl = document.getElementById("d-skills-missing-required");
            const allExtractedEl = document.getElementById("d-skills-all-extracted");
            
            matchedRequiredEl.innerHTML = "";
            missingRequiredEl.innerHTML = "";
            allExtractedEl.innerHTML = "";

            // Populate matched/missing required checklists
            if (match.matches && match.matches.length > 0) {
                match.matches.forEach(item => {
                    const pill = document.createElement("div");
                    if (item.matched) {
                        pill.className = "align-pill met";
                        pill.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${item.requirement}`;
                        matchedRequiredEl.appendChild(pill);
                    } else {
                        pill.className = "align-pill unmet";
                        pill.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> ${item.requirement}`;
                        missingRequiredEl.appendChild(pill);
                    }
                });
            } else {
                matchedRequiredEl.innerHTML = "<p style='font-size:11px;color:var(--text-muted)'>None computed</p>";
                missingRequiredEl.innerHTML = "<p style='font-size:11px;color:var(--text-muted)'>None computed</p>";
            }

            // Populate all extracted skill tags
            if (extSkills.length > 0) {
                extSkills.forEach(s => {
                    const tag = document.createElement("span");
                    tag.className = "ext-skill-tag";
                    tag.textContent = `${s.name} (${s.category || 'skill'})`;
                    allExtractedEl.appendChild(tag);
                });
            } else {
                allExtractedEl.innerHTML = "<p style='font-size:11px;color:var(--text-muted)'>No skills parsed</p>";
            }
        }
        
        else if (tabId === "d-experience-tab") {
            const expEval = details.experience_eval || {};
            const resume = details.resume_data || {};
            
            document.getElementById("d-exp-progression").textContent = expEval.reasoning || "No detailed work assessment provided.";
            
            const timelineEl = document.getElementById("d-exp-timeline");
            timelineEl.innerHTML = "";
            
            // Populate timeline rows
            if (resume.work_experience && resume.work_experience.length > 0) {
                resume.work_experience.forEach(work => {
                    const item = document.createElement("div");
                    item.className = "timeline-item";
                    item.innerHTML = `
                        <div class="timeline-header">
                            <div>
                                <span style="font-weight:700;">${work.title}</span> — 
                                <span class="timeline-company">${work.company}</span>
                            </div>
                            <span class="timeline-dur">${work.start_date || ''} - ${work.end_date || 'Present'}</span>
                        </div>
                        <div class="timeline-text">
                            ${work.responsibilities ? work.responsibilities.slice(0, 2).map(r => `• ${r}`).join("<br>") : ""}
                        </div>
                    `;
                    timelineEl.appendChild(item);
                });
            } else {
                timelineEl.innerHTML = "<p style='font-size:11px;color:var(--text-muted)'>No timeline parsed</p>";
            }

            // Populate Education rows
            const eduListEl = document.getElementById("d-edu-list");
            eduListEl.innerHTML = "";
            if (resume.education && resume.education.length > 0) {
                resume.education.forEach(edu => {
                    const row = document.createElement("div");
                    row.className = "edu-row";
                    row.innerHTML = `
                        <div class="edu-row-title">${edu.degree} in ${edu.field}</div>
                        <div class="edu-row-school">${edu.institution} (${edu.graduation_year})</div>
                    `;
                    eduListEl.appendChild(row);
                });
            } else {
                eduListEl.innerHTML = "<p style='font-size:11px;color:var(--text-muted)'>No education data parsed</p>";
            }
        }
        
        else if (tabId === "d-interview-tab") {
            const match = details.skills_match || {};
            const expEval = details.experience_eval || {};
            
            const questionsListEl = document.getElementById("d-interview-questions-list");
            questionsListEl.innerHTML = "";
            
            const questions = [];
            
            // Unmatched skills
            const missing = (match.matches || []).filter(m => !m.matched).map(m => m.requirement);
            if (missing.length > 0) {
                missing.slice(0, 2).forEach(s => {
                    questions.push({
                        q: `We noticed you do not explicitly list "${s}" in your work history. Can you share your practical understanding or exposure regarding this technology?`,
                        r: `Validate missing required competency: **${s}**.`
                    });
                });
            }

            // Gaps
            const gaps = expEval.gaps_identified || [];
            if (gaps.length > 0) {
                gaps.slice(0, 2).forEach(g => {
                    questions.push({
                        q: `The resume timeline indicates a focal adjustment: "${g}". Can you share the context behind this period?`,
                        r: `Address timeline notes.`
                    });
                });
            }

            // Strengths
            const strengths = expEval.strengths || [];
            if (strengths.length > 0) {
                strengths.slice(0, 2).forEach(s => {
                    questions.push({
                        q: `Your profile indicates high mastery in "${s}". Can you detail a production-level architectural problem you resolved in this area?`,
                        r: `Deep dive into verified core strength: **${s}**.`
                    });
                });
            }

            if (questions.length === 0) {
                questions.push({
                    q: "Can you detail a complex software product you spearheaded from scratch, explaining the choices behind your tech stack?",
                    r: "Standard software architecture baseline."
                });
            }

            // Render Questions
            questions.forEach(item => {
                const el = document.createElement("div");
                el.className = "guide-item";
                el.innerHTML = `
                    <div class="guide-q">${item.q}</div>
                    <div class="guide-r"><i class="fa-solid fa-brain"></i> Agent Context: ${item.r}</div>
                `;
                questionsListEl.appendChild(el);
            });
        }
    }
});
