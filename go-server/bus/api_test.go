package bus

import (
	"strings"
	"testing"
)

// A route number can be served by two operators and can run several service
// types in one direction. Each such combination is a separate stop sequence,
// so an unfiltered lookup returns several interleaved sequences that cannot be
// rendered as one route.
func TestBuildStopsByRouteQueryFilters(t *testing.T) {
	cases := []struct {
		name        string
		company     string
		direction   string
		serviceType string
		wantClauses []string
		wantArgs    []interface{}
	}{
		{
			name:     "route only",
			wantArgs: []interface{}{"1"},
		},
		{
			name:        "company only",
			company:     "KMB",
			wantClauses: []string{"AND rs.company = $2"},
			wantArgs:    []interface{}{"1", "KMB"},
		},
		{
			name:        "company and direction",
			company:     "KMB",
			direction:   "O",
			wantClauses: []string{"AND rs.company = $2", "AND rs.direction = $3"},
			wantArgs:    []interface{}{"1", "KMB", "O"},
		},
		{
			name:        "all filters",
			company:     "KMB",
			direction:   "O",
			serviceType: "1",
			wantClauses: []string{
				"AND rs.company = $2",
				"AND rs.direction = $3",
				"AND rs.service_type = $4",
			},
			wantArgs: []interface{}{"1", "KMB", "O", "1"},
		},
		{
			// Placeholders must track the args actually appended, not the
			// filter's fixed position.
			name:        "direction skipped keeps placeholders contiguous",
			company:     "KMB",
			serviceType: "1",
			wantClauses: []string{"AND rs.company = $2", "AND rs.service_type = $3"},
			wantArgs:    []interface{}{"1", "KMB", "1"},
		},
		{
			name:        "service type only",
			serviceType: "2",
			wantClauses: []string{"AND rs.service_type = $2"},
			wantArgs:    []interface{}{"1", "2"},
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			sql, args := buildStopsByRouteQuery("1", tc.company, tc.direction, tc.serviceType)

			for _, clause := range tc.wantClauses {
				if !strings.Contains(sql, clause) {
					t.Errorf("missing clause %q in:\n%s", clause, sql)
				}
			}
			if len(args) != len(tc.wantArgs) {
				t.Fatalf("args = %v, want %v", args, tc.wantArgs)
			}
			for i, want := range tc.wantArgs {
				if args[i] != want {
					t.Errorf("args[%d] = %v, want %v", i, args[i], want)
				}
			}
		})
	}
}

// Empty filters must not become "= ”" predicates: Citybus stores an empty
// direction on its route rows, and matching on that would return nothing.
func TestBuildStopsByRouteQueryOmitsEmptyFilters(t *testing.T) {
	sql, args := buildStopsByRouteQuery("1", "", "", "")

	// Match on the placeholder, not the bare column: the JOIN condition
	// legitimately contains "rs.company = s.company".
	for _, unwanted := range []string{"rs.company = $", "rs.direction = $", "rs.service_type = $"} {
		if strings.Contains(sql, unwanted) {
			t.Errorf("unexpected filter %q for empty value in:\n%s", unwanted, sql)
		}
	}
	if len(args) != 1 || args[0] != "1" {
		t.Errorf("args = %v, want [1]", args)
	}
}

// seq is stored as text, so ordering must cast it — otherwise stop 10 sorts
// before stop 2. Grouping columns keep each sequence contiguous.
func TestBuildStopsByRouteQueryOrdering(t *testing.T) {
	sql, _ := buildStopsByRouteQuery("1", "", "", "")

	if !strings.Contains(sql, "CAST(rs.seq AS INTEGER)") {
		t.Errorf("seq must be cast for numeric ordering, got:\n%s", sql)
	}
	orderBy := sql[strings.Index(sql, "ORDER BY"):]
	for _, col := range []string{"rs.company", "rs.direction", "rs.service_type"} {
		if !strings.Contains(orderBy, col) {
			t.Errorf("ORDER BY missing %q, got: %s", col, orderBy)
		}
	}
}

func TestBuildRouteVariantsQuery(t *testing.T) {
	t.Run("exact match on route, not a pattern", func(t *testing.T) {
		sql, args := buildRouteVariantsQuery("1", "")

		if !strings.Contains(sql, "WHERE route = $1") {
			t.Errorf("expected exact match on route, got:\n%s", sql)
		}
		if strings.Contains(sql, "ILIKE") || strings.Contains(sql, "LIKE") {
			t.Errorf("variant lookup must not use pattern matching, got:\n%s", sql)
		}
		if strings.Contains(sql, "LIMIT") {
			t.Errorf("variant lookup must not cap results, got:\n%s", sql)
		}
		if len(args) != 1 || args[0] != "1" {
			t.Errorf("args = %v, want [1]", args)
		}
	})

	t.Run("optional company filter", func(t *testing.T) {
		sql, args := buildRouteVariantsQuery("1", "KMB")

		if !strings.Contains(sql, "AND company = $2") {
			t.Errorf("missing company filter in:\n%s", sql)
		}
		if len(args) != 2 || args[1] != "KMB" {
			t.Errorf("args = %v, want [1 KMB]", args)
		}
	})

	t.Run("outbound ordered before inbound", func(t *testing.T) {
		sql, _ := buildRouteVariantsQuery("1", "")

		orderBy := sql[strings.Index(sql, "ORDER BY"):]
		outbound := strings.Index(orderBy, "'O' THEN 0")
		inbound := strings.Index(orderBy, "'I' THEN 1")
		if outbound == -1 || inbound == -1 {
			t.Fatalf("expected explicit direction ordering, got: %s", orderBy)
		}
		if outbound > inbound {
			t.Errorf("outbound must rank before inbound, got: %s", orderBy)
		}
		if !strings.Contains(orderBy, "service_type") {
			t.Errorf("ORDER BY missing service_type, got: %s", orderBy)
		}
	})
}
