namespace :citydata do
	desc "TODO"
	task generate_city_latlong: :environment do
	print 'Running task \n'
  	require 'json'
  	require 'csv'
  	require 'pry'
  	
  	country = CGI::escape(ENV['COUNTRY']) ? CGI::escape(ENV['COUNTRY']) : 'Italy'
  	puts 'Running task for #{country} \n'
	seedfile = File.read("#{Rails.root}/public/cities.csv")
	# csvObject = CSV.read(seedfile)
	csvObject = CSV.read("#{Rails.root}/public/cities.csv")
	countryCsvObject = csvObject.select {|csvLine| csvLine == "#{country}"}
	columns = csvObject.first

	binding.pry
	# On each line give the key value pair for the array

	# mappedArray = countryCsvObject.each.each_with_index.map{|field,index| [columns[index%columns.length],line[index%columns.length]]}
	mappedArray = countryCsvObject.each do |city|
		city.map.with_index{|field,index| [columns[index],field]}
	end

	mappedArray.each.inject({}) do |result,element|
		result[element.first.to_s] = element.last.downcase
  		result
	end

	mappedArray.each do |city|
		city['position'] =  Generate10MileLatLongBoundingBox(city)
	end

	puts mappedArray.first

	# create a has from each mapped array and create an array of objects.


	def Generate10MileLatLongBoundingBox(cityObject)

		# latitude = csvObject[3]
		# longitude = csvObject[4]
		latitude = cityObject["latitude"]
		longitude = cityObject["longitude"]
		roughFactor = 0.005
		minLat = latitude - roughFactor
		maxLat = latitude + roughFactor
		minLong = longitude - roughFactor
		maxLong = longitude + roughFactor
		positionObject = {"minLat" => minLat,"maxLat" => maxlat, "minLong" => minLong, "maxLong" => maxLong, "lat" => latitude, "long" => longitude, "alt" => cityObject["altitude"]} 
	end
end
end
